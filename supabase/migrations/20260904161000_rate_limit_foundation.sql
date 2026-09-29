-- Rate Limit & Usage Foundation
-- Phase 3.2: Anti-abuse rate limiting infrastructure
-- 
-- Changes:
-- 1. Add rate limit fields to profiles (org creation tracking)
-- 2. Create org_creation_rate_limits table for configurable limits
-- 3. Add helper functions for rate limit checks
-- 4. Foundation for future usage/quota tracking

BEGIN;

-- ============================================================================
-- 1. Add rate limit tracking fields to profiles
-- ============================================================================

ALTER TABLE core.profiles
  ADD COLUMN IF NOT EXISTS last_org_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS org_creation_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_last_org_created 
  ON core.profiles(last_org_created_at);

COMMENT ON COLUMN core.profiles.last_org_created_at IS 
  '마지막 조직 생성 시각 (rate limit 체크용)';
COMMENT ON COLUMN core.profiles.org_creation_count IS 
  '총 생성한 조직 수 (rate limit 체크용)';

-- ============================================================================
-- 2. Create configurable rate limit settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.rate_limit_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_type        TEXT NOT NULL UNIQUE,
  max_requests      INTEGER NOT NULL,
  window_seconds    INTEGER NOT NULL,
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_type 
  ON core.rate_limit_configs(limit_type, is_active);

-- Insert default rate limits
INSERT INTO core.rate_limit_configs (limit_type, max_requests, window_seconds, description) VALUES
  ('org_creation_per_hour', 3, 3600, '시간당 조직 생성 제한 (동일 사용자)'),
  ('org_creation_per_day', 5, 86400, '일일 조직 생성 제한 (동일 사용자)'),
  ('join_request_per_hour', 10, 3600, '시간당 가입 신청 제한 (동일 사용자)'),
  ('join_request_per_day', 20, 86400, '일일 가입 신청 제한 (동일 사용자)')
ON CONFLICT (limit_type) DO NOTHING;

COMMENT ON TABLE core.rate_limit_configs IS 
  '레이트 리미트 설정 (조직 생성, 가입 신청 등)';

-- Trigger for updated_at
CREATE TRIGGER update_rate_limit_configs_updated_at
  BEFORE UPDATE ON core.rate_limit_configs
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- ============================================================================
-- 3. Rate limit check helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION core.check_rate_limit(
  p_user_id UUID,
  p_limit_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_config RECORD;
  v_last_action TIMESTAMPTZ;
  v_action_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_is_allowed BOOLEAN;
  v_retry_after INTEGER;
BEGIN
  -- Get rate limit config
  SELECT * INTO v_config
  FROM core.rate_limit_configs
  WHERE limit_type = p_limit_type AND is_active = true;
  
  IF NOT FOUND THEN
    -- No limit configured, allow by default
    RETURN json_build_object(
      'allowed', true,
      'limit_type', p_limit_type,
      'reason', 'no_limit_configured'
    );
  END IF;
  
  -- Calculate window start time
  v_window_start := now() - (v_config.window_seconds || ' seconds')::interval;
  
  -- Check specific rate limit based on type
  IF p_limit_type LIKE 'org_creation%' THEN
    SELECT last_org_created_at INTO v_last_action
    FROM core.profiles
    WHERE id = p_user_id;
    
    -- Count orgs created within window
    SELECT COUNT(*) INTO v_action_count
    FROM core.organizations
    WHERE id IN (
      SELECT organization_id 
      FROM core.organization_members 
      WHERE user_id = p_user_id AND role = 'owner'
    )
    AND created_at > v_window_start;
    
  ELSIF p_limit_type LIKE 'join_request%' THEN
    -- Count join requests within window
    SELECT COUNT(*) INTO v_action_count
    FROM core.customer_join_requests
    WHERE applicant_user_id = p_user_id
    AND created_at > v_window_start;
  ELSE
    v_action_count := 0;
  END IF;
  
  -- Determine if allowed
  v_is_allowed := v_action_count < v_config.max_requests;
  
  -- Calculate retry_after (seconds until window resets)
  IF NOT v_is_allowed AND v_last_action IS NOT NULL THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_last_action + (v_config.window_seconds || ' seconds')::interval - now()))::INTEGER;
  ELSE
    v_retry_after := 0;
  END IF;
  
  RETURN json_build_object(
    'allowed', v_is_allowed,
    'limit_type', p_limit_type,
    'current_count', v_action_count,
    'max_requests', v_config.max_requests,
    'window_seconds', v_config.window_seconds,
    'retry_after', GREATEST(v_retry_after, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION core.check_rate_limit TO authenticated;
REVOKE EXECUTE ON FUNCTION core.check_rate_limit FROM anon;

COMMENT ON FUNCTION core.check_rate_limit IS 
  '레이트 리미트 체크 (조직 생성, 가입 신청 등)';

-- ============================================================================
-- 4. Usage tracking foundation (for future free/paid tier limits)
-- ============================================================================

-- Create usage quotas table (not enforced yet, structure only)
CREATE TABLE IF NOT EXISTS core.organization_quotas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  quota_type        TEXT NOT NULL,  -- 'schedules_per_month', 'customers_max', etc.
  quota_limit       INTEGER NOT NULL,
  quota_used        INTEGER NOT NULL DEFAULT 0,
  reset_at          TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, quota_type)
);

CREATE INDEX IF NOT EXISTS idx_org_quotas_org_type 
  ON core.organization_quotas(organization_id, quota_type);

COMMENT ON TABLE core.organization_quotas IS 
  '조직별 사용량 할당 (추후 free/paid 티어 구분, 현재는 구조만)';

-- Trigger for updated_at
CREATE TRIGGER update_organization_quotas_updated_at
  BEFORE UPDATE ON core.organization_quotas
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- RLS: Only org owner/admin can view quotas
CREATE POLICY org_quotas_select_owner_admin 
  ON core.organization_quotas
  FOR SELECT 
  TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

ALTER TABLE core.organization_quotas ENABLE ROW LEVEL SECURITY;

COMMIT;
