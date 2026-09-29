-- 앱 푸시 디바이스 토큰 (카카오/SMS 없음 — 앱 푸시 전용)
CREATE TABLE IF NOT EXISTS core.push_device_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  token           TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user
  ON core.push_device_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_org
  ON core.push_device_tokens (organization_id);

ALTER TABLE core.push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_self_all ON core.push_device_tokens;
CREATE POLICY push_tokens_self_all ON core.push_device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON core.push_device_tokens TO authenticated;

-- 학부모 푸시 대상 토큰 조회 (서비스 롤 / Edge용)
CREATE OR REPLACE FUNCTION core.get_push_tokens_for_customer(
  p_organization_id UUID,
  p_customer_id UUID
)
RETURNS TABLE (token TEXT, platform TEXT, user_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT DISTINCT pdt.token, pdt.platform, pdt.user_id
  FROM core.push_device_tokens pdt
  WHERE pdt.user_id IN (
    SELECT p.user_id
    FROM core.parents p
    JOIN core.parent_student_guardians psg ON psg.parent_id = p.id
    JOIN core.student_enrollments se ON se.student_id = psg.student_id
    WHERE se.organization_id = p_organization_id
      AND se.customer_id = p_customer_id
      AND p.user_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION core.get_push_tokens_for_customer(UUID, UUID) TO service_role;
