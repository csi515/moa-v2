-- Moa Platform SaaS 구독. 사업장 회원권/회차권과 완전히 분리한다.
-- 결제 provider 연동은 하지 않는다. core.session_passes / sales / payments 는 변경하지 않는다.

BEGIN;

CREATE SCHEMA IF NOT EXISTS platform;

GRANT USAGE ON SCHEMA platform TO authenticated, anon;

CREATE OR REPLACE FUNCTION platform.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE platform.plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_plans_code_check CHECK (length(btrim(code)) > 0)
);

COMMENT ON TABLE platform.plans IS
  'Moa SaaS 요금제. 학원 회원권/회차권 상품이 아니다.';

CREATE TABLE platform.feature_entitlements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES platform.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_feature_entitlements_key_check
    CHECK (feature_key IN ('booking', 'loyalty', 'maintenance')),
  CONSTRAINT platform_feature_entitlements_unique UNIQUE (plan_id, feature_key)
);

COMMENT ON TABLE platform.feature_entitlements IS
  '요금제가 포함하는 플랫폼 기능. 업종 플러그인 탭 목록과 다른 축이다.';

CREATE TABLE platform.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES platform.plans(id) ON DELETE RESTRICT,
  billing_status  TEXT NOT NULL DEFAULT 'trialing',
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ,
  canceled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_subscriptions_status_check
    CHECK (billing_status IN (
      'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired'
    ))
);

COMMENT ON TABLE platform.subscriptions IS
  '테넌트(organization)의 Moa SaaS 구독. core.session_passes 와 공유하지 않는다.';
COMMENT ON COLUMN platform.subscriptions.billing_status IS
  '구독 청구 상태. 외부 결제 연동 전 수동 값.';

CREATE UNIQUE INDEX uq_platform_subscriptions_current
  ON platform.subscriptions (organization_id)
  WHERE billing_status IN ('trialing', 'active', 'past_due', 'paused');

CREATE INDEX idx_platform_subscriptions_org
  ON platform.subscriptions (organization_id, billing_status);

CREATE TABLE platform.subscription_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES platform.subscriptions(id) ON DELETE CASCADE,
  feature_key     TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_subscription_items_key_check
    CHECK (feature_key IN ('booking', 'loyalty', 'maintenance')),
  CONSTRAINT platform_subscription_items_unique UNIQUE (subscription_id, feature_key)
);

COMMENT ON TABLE platform.subscription_items IS
  '테넌트별 기능 on/off. plan entitlement를 덮어쓴다.';

CREATE INDEX idx_platform_subscription_items_org
  ON platform.subscription_items (organization_id, feature_key);

CREATE TRIGGER trg_platform_plans_updated_at
  BEFORE UPDATE ON platform.plans
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

CREATE TRIGGER trg_platform_subscriptions_updated_at
  BEFORE UPDATE ON platform.subscriptions
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

CREATE TRIGGER trg_platform_subscription_items_updated_at
  BEFORE UPDATE ON platform.subscription_items
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_plans_select ON platform.plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY platform_feature_entitlements_select ON platform.feature_entitlements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY platform_subscriptions_staff_select ON platform.subscriptions
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

CREATE POLICY platform_subscription_items_staff_select ON platform.subscription_items
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

GRANT SELECT ON platform.plans TO authenticated;
GRANT SELECT ON platform.feature_entitlements TO authenticated;
GRANT SELECT ON platform.subscriptions TO authenticated;
GRANT SELECT ON platform.subscription_items TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON platform.plans FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON platform.feature_entitlements FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON platform.subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON platform.subscription_items FROM authenticated, anon;

CREATE OR REPLACE FUNCTION platform.is_feature_enabled(
  p_organization_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = platform, core, public
AS $$
  SELECT COALESCE((
    WITH current_sub AS (
      SELECT s.id, s.plan_id
      FROM platform.subscriptions s
      WHERE s.organization_id = p_organization_id
        AND s.billing_status IN ('trialing', 'active', 'past_due')
      ORDER BY s.starts_at DESC
      LIMIT 1
    ),
    plan_flag AS (
      SELECT e.enabled
      FROM current_sub cs
      JOIN platform.feature_entitlements e ON e.plan_id = cs.plan_id
      WHERE e.feature_key = p_feature_key
    ),
    item_flag AS (
      SELECT i.enabled
      FROM current_sub cs
      JOIN platform.subscription_items i ON i.subscription_id = cs.id
      WHERE i.feature_key = p_feature_key
        AND i.organization_id = p_organization_id
    )
    SELECT COALESCE(
      (SELECT enabled FROM item_flag),
      (SELECT enabled FROM plan_flag),
      false
    )
  ), false);
$$;

COMMENT ON FUNCTION platform.is_feature_enabled(UUID, TEXT) IS
  '테넌트 feature gate. 구독이 없거나 비허용 상태면 false. 이용권 잔여와 무관.';

GRANT EXECUTE ON FUNCTION platform.is_feature_enabled(UUID, TEXT) TO authenticated;

INSERT INTO platform.plans (code, name, description) VALUES
  ('starter', 'Starter', '예약 기본'),
  ('standard', 'Standard', '예약 + 로열티'),
  ('operations', 'Operations', '예약 + 유지보수');

INSERT INTO platform.feature_entitlements (plan_id, feature_key, enabled)
SELECT p.id, f.feature_key, f.enabled
FROM platform.plans p
JOIN (
  VALUES
    ('starter', 'booking', true),
    ('starter', 'loyalty', false),
    ('starter', 'maintenance', false),
    ('standard', 'booking', true),
    ('standard', 'loyalty', true),
    ('standard', 'maintenance', false),
    ('operations', 'booking', true),
    ('operations', 'loyalty', false),
    ('operations', 'maintenance', true)
) AS f(code, feature_key, enabled)
  ON f.code = p.code;

COMMIT;
