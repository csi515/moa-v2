-- 공통 대기열. 예약 원장을 복제하지 않는다.
-- 순번·동시 배정은 RPC + advisory lock 으로 보장한다.
-- Bath 전용 테이블을 만들지 않는다.

CREATE TYPE core.waitlist_status AS ENUM (
  'waiting',
  'notified',
  'assigned',
  'cancelled',
  'expired'
);

CREATE TABLE core.waitlist_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE RESTRICT,
  schedule_id       UUID REFERENCES core.schedules(id) ON DELETE SET NULL,
  requested_time    TIMESTAMPTZ,
  status            core.waitlist_status NOT NULL DEFAULT 'waiting',
  position          INT NOT NULL,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at       TIMESTAMPTZ,
  assigned_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  expired_at        TIMESTAMPTZ,
  booking_id        UUID,
  reservation_id    UUID REFERENCES core.room_reservations(id) ON DELETE SET NULL,
  notification_id   UUID REFERENCES core.notifications(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_target_time_check CHECK (
    schedule_id IS NOT NULL OR requested_time IS NOT NULL
  ),
  CONSTRAINT waitlist_position_check CHECK (position >= 1),
  CONSTRAINT waitlist_target_nonempty_check CHECK (
    length(btrim(target_type)) > 0 AND length(btrim(target_id)) > 0
  )
);

COMMENT ON TABLE core.waitlist_entries IS
  '공통 대기열. Booking/Resource Reservation FK는 선택 연결이다.';
COMMENT ON COLUMN core.waitlist_entries.booking_id IS
  '선택 연결. 업종 예약 원장이 다를 수 있어 FK 없음.';
COMMENT ON COLUMN core.waitlist_entries.notification_id IS
  'Notification Capability 연결. SMS 발송은 하지 않는다.';

CREATE INDEX idx_waitlist_org_target_status
  ON core.waitlist_entries (organization_id, target_type, target_id, status, position);
CREATE INDEX idx_waitlist_org_customer
  ON core.waitlist_entries (organization_id, customer_id, joined_at DESC);

CREATE UNIQUE INDEX uq_waitlist_open_position
  ON core.waitlist_entries (organization_id, target_type, target_id, position)
  WHERE status IN ('waiting', 'notified');

CREATE UNIQUE INDEX uq_waitlist_open_customer
  ON core.waitlist_entries (organization_id, target_type, target_id, customer_id)
  WHERE status IN ('waiting', 'notified');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_entries_select ON core.waitlist_entries
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_customer(organization_id, customer_id)
  );

GRANT SELECT ON core.waitlist_entries TO authenticated;

CREATE OR REPLACE FUNCTION core.waitlist_payload(
  p_row core.waitlist_entries,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT to_jsonb(p_row) || jsonb_build_object('action', p_action);
$$;

CREATE OR REPLACE FUNCTION core.waitlist_lock_queue(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT
)
RETURNS VOID
LANGUAGE sql
AS $$
  SELECT pg_advisory_xact_lock(
    hashtext('waitlist'),
    hashtext(p_organization_id::text || ':' || p_target_type || ':' || p_target_id)
  );
$$;

CREATE OR REPLACE FUNCTION core.resequence_waitlist(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE core.waitlist_entries
  SET position = position + 1000000
  WHERE organization_id = p_organization_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND status IN ('waiting', 'notified');

  UPDATE core.waitlist_entries e
  SET position = r.rn
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, joined_at) AS rn
    FROM core.waitlist_entries
    WHERE organization_id = p_organization_id
      AND target_type = p_target_type
      AND target_id = p_target_id
      AND status IN ('waiting', 'notified')
  ) r
  WHERE e.id = r.id;
END;
$$;

CREATE OR REPLACE FUNCTION core.join_waitlist(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT,
  p_customer_id UUID,
  p_schedule_id UUID DEFAULT NULL,
  p_requested_time TIMESTAMPTZ DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_reservation_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_type TEXT;
  v_target TEXT;
  v_requested TIMESTAMPTZ;
  v_existing core.waitlist_entries%ROWTYPE;
  v_created core.waitlist_entries%ROWTYPE;
  v_position INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_type := lower(btrim(COALESCE(p_target_type, '')));
  v_target := btrim(COALESCE(p_target_id, ''));
  IF v_type = '' OR v_target = '' THEN
    RAISE EXCEPTION 'Invalid waitlist target';
  END IF;
  IF NOT (
    core.is_org_staff_actor(p_organization_id)
    OR core.is_my_customer(p_organization_id, p_customer_id)
    OR core.parent_owns_customer(p_organization_id, p_customer_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = p_customer_id AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  v_requested := p_requested_time;
  IF p_schedule_id IS NOT NULL THEN
    SELECT starts_at INTO v_requested
    FROM core.schedules
    WHERE id = p_schedule_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule not found in organization';
    END IF;
    v_requested := COALESCE(p_requested_time, v_requested);
  END IF;
  IF p_schedule_id IS NULL AND v_requested IS NULL THEN
    RAISE EXCEPTION 'Schedule or requested time is required';
  END IF;
  IF p_reservation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.room_reservations rr
    WHERE rr.id = p_reservation_id AND rr.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Reservation not found in organization';
  END IF;

  PERFORM core.waitlist_lock_queue(p_organization_id, v_type, v_target);

  SELECT * INTO v_existing
  FROM core.waitlist_entries
  WHERE organization_id = p_organization_id
    AND target_type = v_type
    AND target_id = v_target
    AND customer_id = p_customer_id
    AND status IN ('waiting', 'notified')
  FOR UPDATE;
  IF FOUND THEN
    RETURN core.waitlist_payload(v_existing, 'idempotent');
  END IF;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM core.waitlist_entries
  WHERE organization_id = p_organization_id
    AND target_type = v_type
    AND target_id = v_target
    AND status IN ('waiting', 'notified');

  INSERT INTO core.waitlist_entries (
    organization_id, target_type, target_id, customer_id,
    schedule_id, requested_time, status, position,
    booking_id, reservation_id, metadata
  ) VALUES (
    p_organization_id, v_type, v_target, p_customer_id,
    p_schedule_id, v_requested, 'waiting', v_position,
    p_booking_id, p_reservation_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_created;

  RETURN core.waitlist_payload(v_created, 'created');
END;
$$;

CREATE OR REPLACE FUNCTION core.cancel_waitlist(
  p_organization_id UUID,
  p_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.waitlist_entries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM core.waitlist_entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF NOT (
    core.is_org_staff_actor(p_organization_id)
    OR core.is_my_customer(p_organization_id, v_row.customer_id)
    OR core.parent_owns_customer(p_organization_id, v_row.customer_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF v_row.status = 'cancelled' THEN
    RETURN core.waitlist_payload(v_row, 'idempotent');
  END IF;
  IF v_row.status NOT IN ('waiting', 'notified') THEN
    RAISE EXCEPTION 'Waitlist entry is not cancellable';
  END IF;

  PERFORM core.waitlist_lock_queue(p_organization_id, v_row.target_type, v_row.target_id);

  UPDATE core.waitlist_entries
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  PERFORM core.resequence_waitlist(p_organization_id, v_row.target_type, v_row.target_id);
  RETURN core.waitlist_payload(v_row, 'cancelled');
END;
$$;

CREATE OR REPLACE FUNCTION core.expire_waitlist(
  p_organization_id UUID,
  p_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.waitlist_entries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row FROM core.waitlist_entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status = 'expired' THEN
    RETURN core.waitlist_payload(v_row, 'idempotent');
  END IF;
  IF v_row.status NOT IN ('waiting', 'notified') THEN
    RAISE EXCEPTION 'Waitlist entry is not expirable';
  END IF;

  PERFORM core.waitlist_lock_queue(p_organization_id, v_row.target_type, v_row.target_id);

  UPDATE core.waitlist_entries
  SET status = 'expired', expired_at = now(), updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  PERFORM core.resequence_waitlist(p_organization_id, v_row.target_type, v_row.target_id);
  RETURN core.waitlist_payload(v_row, 'expired');
END;
$$;

CREATE OR REPLACE FUNCTION core.notify_waitlist(
  p_organization_id UUID,
  p_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.waitlist_entries%ROWTYPE;
  v_notification_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_row FROM core.waitlist_entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status = 'notified' THEN
    RETURN core.waitlist_payload(v_row, 'idempotent');
  END IF;
  IF v_row.status <> 'waiting' THEN
    RAISE EXCEPTION 'Waitlist entry is not waiting';
  END IF;

  INSERT INTO core.notifications (
    organization_id, type, title, message,
    target_type, target_id, status, channel, metadata
  ) VALUES (
    p_organization_id,
    'waitlist',
    '대기 순번 안내',
    '빈자리가 생겼습니다. 예약을 진행해 주세요.',
    'waitlist_entry',
    v_row.id,
    'pending',
    'app',
    jsonb_build_object(
      'eventKey', 'waitlist:' || v_row.id || ':notified',
      'waitlistEntryId', v_row.id,
      'targetType', v_row.target_type,
      'targetId', v_row.target_id
    )
  )
  RETURNING id INTO v_notification_id;

  UPDATE core.waitlist_entries
  SET status = 'notified',
      notified_at = now(),
      notification_id = v_notification_id,
      updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  RETURN core.waitlist_payload(v_row, 'notified');
END;
$$;

CREATE OR REPLACE FUNCTION core.claim_waitlist_vacancy(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_reservation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_type TEXT;
  v_target TEXT;
  v_row core.waitlist_entries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  v_type := lower(btrim(COALESCE(p_target_type, '')));
  v_target := btrim(COALESCE(p_target_id, ''));
  IF v_type = '' OR v_target = '' THEN
    RAISE EXCEPTION 'Invalid waitlist target';
  END IF;

  PERFORM core.waitlist_lock_queue(p_organization_id, v_type, v_target);

  SELECT * INTO v_row
  FROM core.waitlist_entries
  WHERE organization_id = p_organization_id
    AND target_type = v_type
    AND target_id = v_target
    AND status IN ('waiting', 'notified')
  ORDER BY position, joined_at
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist is empty';
  END IF;

  UPDATE core.waitlist_entries
  SET status = 'assigned',
      assigned_at = now(),
      booking_id = COALESCE(p_booking_id, booking_id),
      reservation_id = COALESCE(p_reservation_id, reservation_id),
      updated_at = now()
  WHERE id = v_row.id AND organization_id = p_organization_id
  RETURNING * INTO v_row;

  PERFORM core.resequence_waitlist(p_organization_id, v_type, v_target);
  RETURN core.waitlist_payload(v_row, 'assigned');
END;
$$;

REVOKE ALL ON FUNCTION core.waitlist_payload(core.waitlist_entries, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.waitlist_lock_queue(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.resequence_waitlist(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.join_waitlist(UUID, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.cancel_waitlist(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.expire_waitlist(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.notify_waitlist(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.claim_waitlist_vacancy(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.join_waitlist(UUID, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.cancel_waitlist(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.expire_waitlist(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.notify_waitlist(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.claim_waitlist_vacancy(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION core.join_waitlist IS
  '대기 등록. 같은 대상·고객의 열린 항목은 멱등.';
COMMENT ON FUNCTION core.cancel_waitlist IS
  '대기 취소 후 남은 순번을 다시 매긴다.';
COMMENT ON FUNCTION core.expire_waitlist IS
  '대기 만료 후 남은 순번을 다시 매긴다.';
COMMENT ON FUNCTION core.notify_waitlist IS
  '대기 알림. core.notifications pending 행만 만든다. SMS 없음.';
COMMENT ON FUNCTION core.claim_waitlist_vacancy IS
  '빈자리 1석을 맨 앞 대기자에게 배정. 동시 호출은 큐 락으로 직렬화.';
