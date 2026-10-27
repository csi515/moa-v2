-- Bath 고유 도메인: 방문(Visit). Core customer/product/pass를 참조만 한다.
-- 입장/퇴장/취소는 staff RPC + FOR UPDATE. 결제·이용권 차감은 하지 않는다.

CREATE SCHEMA IF NOT EXISTS bath;

GRANT USAGE ON SCHEMA bath TO authenticated, anon;

CREATE TYPE bath.visit_status AS ENUM (
  'checked_in',
  'checked_out',
  'cancelled'
);

CREATE TABLE bath.visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES core.customers(id) ON DELETE RESTRICT,
  check_in_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at          TIMESTAMPTZ,
  status                bath.visit_status NOT NULL DEFAULT 'checked_in',
  entry_product_id      UUID REFERENCES core.products(id) ON DELETE SET NULL,
  pass_id               UUID REFERENCES core.session_passes(id) ON DELETE SET NULL,
  locker_id             UUID,
  room_reservation_id   UUID,
  staff_id              UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  memo                  TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bath_visits_checkout_matches_status CHECK (
    (status = 'checked_in' AND check_out_at IS NULL)
    OR (status = 'checked_out' AND check_out_at IS NOT NULL)
    OR (status = 'cancelled')
  )
);

COMMENT ON TABLE bath.visits IS
  '목욕탕 이용 세션. 결제와 강결합하지 않음. locker/room은 향후 테이블 연결용 참조.';
COMMENT ON COLUMN bath.visits.entry_product_id IS '입장권 상품 참조. 결제 생성/차감 없음.';
COMMENT ON COLUMN bath.visits.pass_id IS '이용권 참조. 이 테이블에서 consume/refund 하지 않음.';
COMMENT ON COLUMN bath.visits.locker_id IS '향후 bath.lockers FK 예정. 현재 제약 없음.';
COMMENT ON COLUMN bath.visits.room_reservation_id IS '향후 Resource Reservation 참조. 현재 제약 없음.';

CREATE INDEX idx_bath_visits_org_check_in
  ON bath.visits (organization_id, check_in_at DESC);

CREATE INDEX idx_bath_visits_org_customer
  ON bath.visits (organization_id, customer_id, check_in_at DESC);

CREATE INDEX idx_bath_visits_org_status
  ON bath.visits (organization_id, status);

CREATE UNIQUE INDEX uq_bath_visits_open_customer
  ON bath.visits (organization_id, customer_id)
  WHERE status = 'checked_in';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bath.visits
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE bath.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY bath_visits_select ON bath.visits
  FOR SELECT TO authenticated
  USING (
    core.is_org_staff_actor(organization_id)
    OR core.is_my_customer(organization_id, customer_id)
    OR core.parent_owns_customer(organization_id, customer_id)
  );

CREATE POLICY bath_visits_staff_write ON bath.visits
  FOR ALL TO authenticated
  USING (core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON bath.visits TO authenticated;

CREATE OR REPLACE FUNCTION bath.visit_to_json(p_visit bath.visits, p_action TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'action', p_action,
    'id', p_visit.id,
    'organization_id', p_visit.organization_id,
    'customer_id', p_visit.customer_id,
    'check_in_at', p_visit.check_in_at,
    'check_out_at', p_visit.check_out_at,
    'status', p_visit.status,
    'entry_product_id', p_visit.entry_product_id,
    'pass_id', p_visit.pass_id,
    'locker_id', p_visit.locker_id,
    'room_reservation_id', p_visit.room_reservation_id,
    'staff_id', p_visit.staff_id,
    'memo', p_visit.memo,
    'metadata', p_visit.metadata,
    'created_at', p_visit.created_at,
    'updated_at', p_visit.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION bath.check_in_visit(
  p_organization_id UUID,
  p_customer_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_entry_product_id UUID DEFAULT NULL,
  p_pass_id UUID DEFAULT NULL,
  p_locker_id UUID DEFAULT NULL,
  p_room_reservation_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_existing bath.visits%ROWTYPE;
  v_created bath.visits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM core.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in organization';
  END IF;

  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.staff s
    WHERE s.id = p_staff_id AND s.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Staff not found in organization';
  END IF;

  IF p_entry_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.products p
    WHERE p.id = p_entry_product_id AND p.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Product not found in organization';
  END IF;

  IF p_pass_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.session_passes sp
    WHERE sp.id = p_pass_id
      AND sp.organization_id = p_organization_id
      AND sp.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Pass not found for customer';
  END IF;

  SELECT *
    INTO v_existing
  FROM bath.visits v
  WHERE v.organization_id = p_organization_id
    AND v.customer_id = p_customer_id
    AND v.status = 'checked_in'
  FOR UPDATE;

  IF FOUND THEN
    RETURN bath.visit_to_json(v_existing, 'idempotent');
  END IF;

  BEGIN
    INSERT INTO bath.visits (
      organization_id,
      customer_id,
      staff_id,
      entry_product_id,
      pass_id,
      locker_id,
      room_reservation_id,
      memo,
      metadata,
      status,
      check_in_at
    ) VALUES (
      p_organization_id,
      p_customer_id,
      p_staff_id,
      p_entry_product_id,
      p_pass_id,
      p_locker_id,
      p_room_reservation_id,
      NULLIF(btrim(COALESCE(p_memo, '')), ''),
      COALESCE(p_metadata, '{}'::jsonb),
      'checked_in',
      now()
    )
    RETURNING * INTO v_created;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT *
        INTO v_existing
      FROM bath.visits v
      WHERE v.organization_id = p_organization_id
        AND v.customer_id = p_customer_id
        AND v.status = 'checked_in';
      IF NOT FOUND THEN
        RAISE;
      END IF;
      RETURN bath.visit_to_json(v_existing, 'idempotent');
  END;

  RETURN bath.visit_to_json(v_created, 'created');
END;
$$;

CREATE OR REPLACE FUNCTION bath.check_out_visit(
  p_organization_id UUID,
  p_visit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_visit bath.visits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT *
    INTO v_visit
  FROM bath.visits v
  WHERE v.id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found';
  END IF;

  IF v_visit.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  IF v_visit.status = 'checked_out' THEN
    RETURN bath.visit_to_json(v_visit, 'idempotent');
  END IF;

  IF v_visit.status IS DISTINCT FROM 'checked_in' THEN
    RAISE EXCEPTION 'Visit not open';
  END IF;

  UPDATE bath.visits
  SET
    status = 'checked_out',
    check_out_at = now(),
    updated_at = now()
  WHERE id = v_visit.id
    AND organization_id = p_organization_id
    AND status = 'checked_in'
  RETURNING * INTO v_visit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not open';
  END IF;

  RETURN bath.visit_to_json(v_visit, 'checked_out');
END;
$$;

CREATE OR REPLACE FUNCTION bath.cancel_visit(
  p_organization_id UUID,
  p_visit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = bath, core, public
AS $$
DECLARE
  v_visit bath.visits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_organization_id IS NULL OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT *
    INTO v_visit
  FROM bath.visits v
  WHERE v.id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found';
  END IF;

  IF v_visit.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;

  IF v_visit.status = 'cancelled' THEN
    RETURN bath.visit_to_json(v_visit, 'idempotent');
  END IF;

  IF v_visit.status IS DISTINCT FROM 'checked_in' THEN
    RAISE EXCEPTION 'Visit not cancellable';
  END IF;

  UPDATE bath.visits
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = v_visit.id
    AND organization_id = p_organization_id
    AND status = 'checked_in'
  RETURNING * INTO v_visit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not cancellable';
  END IF;

  RETURN bath.visit_to_json(v_visit, 'cancelled');
END;
$$;

COMMENT ON FUNCTION bath.check_in_visit(UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) IS
  '방문 입장. 고객당 열린 visit 1건. 이용권 차감 없음. staff only.';
COMMENT ON FUNCTION bath.check_out_visit(UUID, UUID) IS
  '방문 퇴장. checked_in만. 멱등. staff only.';
COMMENT ON FUNCTION bath.cancel_visit(UUID, UUID) IS
  '입장 취소. checked_in만. 퇴장 후 취소 금지. staff only.';

REVOKE ALL ON FUNCTION bath.check_in_visit(UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.check_out_visit(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.cancel_visit(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION bath.visit_to_json(bath.visits, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bath.check_in_visit(UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.check_out_visit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bath.cancel_visit(UUID, UUID) TO authenticated;

ALTER ROLE authenticator SET pgrst.db_schemas = 'public, core, piano, bath';
NOTIFY pgrst, 'reload config';
