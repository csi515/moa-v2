-- =============================================================================
-- customer_notifications_realtime: 비용 0원 Supabase Realtime 인앱 알림함
--
-- 문제:
--   외부 유료 알림톡/문자 발송 의존으로 인한 월별 운영비용 증가 및 지연.
--
-- 해결:
--   1. core.customer_notifications 인앱 알림 테이블 구축
--   2. RLS 기반 학부모/고객 본인 데이터 격리 및 스태프 발행 권한 분리
--   3. Supabase Realtime (postgres_changes) 웹소켓 구독을 통한 실시간 0원 통신망 완성
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS core.customer_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.customer_notifications IS
  '고객/학부모 인앱 알림함. Supabase Realtime 웹소켓과 연동하여 비용 0원 실시간 푸시를 제공.';

CREATE INDEX IF NOT EXISTS idx_customer_notifications_cust_created
  ON core.customer_notifications (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_org_cust
  ON core.customer_notifications (organization_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread
  ON core.customer_notifications (customer_id, is_read)
  WHERE is_read = false;

ALTER TABLE core.customer_notifications ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: 본인 고객 레코드 또는 조직 스태프만 조회
DROP POLICY IF EXISTS customer_notifications_select ON core.customer_notifications;
CREATE POLICY customer_notifications_select ON core.customer_notifications
  FOR SELECT TO authenticated
  USING (
    core.is_my_customer(organization_id, customer_id)
    OR core.is_org_staff_actor(organization_id)
  );

-- 2. UPDATE: 본인 고객만 읽음 처리(is_read) 수정 가능
DROP POLICY IF EXISTS customer_notifications_update ON core.customer_notifications;
CREATE POLICY customer_notifications_update ON core.customer_notifications
  FOR UPDATE TO authenticated
  USING (core.is_my_customer(organization_id, customer_id))
  WITH CHECK (core.is_my_customer(organization_id, customer_id));

-- 3. INSERT: 조직 스태프만 알림 발행 가능
DROP POLICY IF EXISTS customer_notifications_insert ON core.customer_notifications;
CREATE POLICY customer_notifications_insert ON core.customer_notifications
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_staff_actor(organization_id));

GRANT SELECT, UPDATE(is_read), INSERT ON core.customer_notifications TO authenticated;
REVOKE DELETE ON core.customer_notifications FROM authenticated, anon;

-- 알림 전송 RPC
CREATE OR REPLACE FUNCTION core.send_customer_notification(
  p_organization_id UUID,
  p_customer_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_category TEXT DEFAULT 'general',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO core.customer_notifications (
    organization_id,
    customer_id,
    title,
    body,
    category,
    metadata
  ) VALUES (
    p_organization_id,
    p_customer_id,
    trim(p_title),
    trim(p_body),
    trim(p_category),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.send_customer_notification(UUID, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 읽음 처리 RPC
CREATE OR REPLACE FUNCTION core.mark_customer_notification_read(
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE core.customer_notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND core.is_my_customer(organization_id, customer_id);

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION core.mark_customer_notification_read(UUID) TO authenticated;

-- Supabase Realtime 등록
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE core.customer_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMIT;
