-- Phase 3: allocation / tax / rounding / booking lifecycle policies
-- docs/MOA_AGNOSTIC_ERP_ROADMAP.md §6
-- Decision: booking_seat_locks remains dormant; soft-hold via hold_ttl_seconds deferred (row lock in book_schedule_slot is SSOT).

BEGIN;

-- ── 3a allocation_policies ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.allocation_policies (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  overbook_mode text NOT NULL DEFAULT 'forbid'
    CHECK (overbook_mode IN ('forbid','warn','allow')),
  negative_stock_mode text NOT NULL DEFAULT 'forbid'
    CHECK (negative_stock_mode IN ('forbid','warn','allow')),
  hold_ttl_seconds integer NOT NULL DEFAULT 900
    CHECK (hold_ttl_seconds >= 0 AND hold_ttl_seconds <= 86400),
  allow_waitlist boolean NOT NULL DEFAULT true,
  enable_safety_stock_alert boolean NOT NULL DEFAULT true,
  default_safety_stock integer NOT NULL DEFAULT 0
    CHECK (default_safety_stock >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE core.allocation_policies IS
  '테넌트 초과예약·마이너스재고·대기열·안전재고 알림 정책 (Phase 3a)';

DROP TRIGGER IF EXISTS set_updated_at ON core.allocation_policies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.allocation_policies
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.allocation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_allocation_policies_select ON core.allocation_policies;
CREATE POLICY core_allocation_policies_select
  ON core.allocation_policies FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_allocation_policies_admin ON core.allocation_policies;
CREATE POLICY core_allocation_policies_admin
  ON core.allocation_policies FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.allocation_policies TO authenticated;

-- settings JSON 백필
INSERT INTO core.allocation_policies (
  organization_id, overbook_mode, negative_stock_mode, hold_ttl_seconds, allow_waitlist
)
SELECT
  o.id,
  COALESCE(NULLIF(o.settings->'allocation_policy'->>'overbook_mode', ''), 'forbid'),
  COALESCE(NULLIF(o.settings->'allocation_policy'->>'negative_stock_mode', ''), 'forbid'),
  COALESCE((o.settings->'allocation_policy'->>'hold_ttl_seconds')::int, 900),
  COALESCE((o.settings->'capability_setup'->'booking'->>'allowWaitlist')::boolean, true)
FROM core.organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- 마이너스 재고: 정책 엔진이 SSOT. CHECK는 forbid 기본 방어를 RPC로 이전.
ALTER TABLE core.inventory DROP CONSTRAINT IF EXISTS inventory_quantity_nonneg_chk;

CREATE OR REPLACE FUNCTION core.resolve_allocation_policy(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS \$\$
DECLARE
  v_row core.allocation_policies%ROWTYPE;
  v_settings jsonb;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'overbook_mode', 'forbid',
      'negative_stock_mode', 'forbid',
      'hold_ttl_seconds', 900,
      'allow_waitlist', true,
      'enable_safety_stock_alert', true,
      'default_safety_stock', 0
    );
  END IF;

  SELECT * INTO v_row FROM core.allocation_policies WHERE organization_id = p_org_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'overbook_mode', v_row.overbook_mode,
      'negative_stock_mode', v_row.negative_stock_mode,
      'hold_ttl_seconds', v_row.hold_ttl_seconds,
      'allow_waitlist', v_row.allow_waitlist,
      'enable_safety_stock_alert', v_row.enable_safety_stock_alert,
      'default_safety_stock', v_row.default_safety_stock
    );
  END IF;

  SELECT settings INTO v_settings FROM core.organizations WHERE id = p_org_id;
  RETURN jsonb_build_object(
    'overbook_mode', COALESCE(NULLIF(v_settings->'allocation_policy'->>'overbook_mode', ''), 'forbid'),
    'negative_stock_mode', COALESCE(NULLIF(v_settings->'allocation_policy'->>'negative_stock_mode', ''), 'forbid'),
    'hold_ttl_seconds', COALESCE((v_settings->'allocation_policy'->>'hold_ttl_seconds')::int, 900),
    'allow_waitlist', COALESCE((v_settings->'capability_setup'->'booking'->>'allowWaitlist')::boolean, true),
    'enable_safety_stock_alert', COALESCE((v_settings->'capability_setup'->'inventory'->>'enableSafetyStockAlert')::boolean, true),
    'default_safety_stock', COALESCE((v_settings->'capability_setup'->'inventory'->>'defaultSafetyStockCount')::int, 0)
  );
END;
\$\$;

REVOKE ALL ON FUNCTION core.resolve_allocation_policy(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.resolve_allocation_policy(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION core.upsert_allocation_policy(
  p_org_id uuid,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS core.allocation_policies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS \$\$
DECLARE
  v_row core.allocation_policies%ROWTYPE;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;
  IF NOT core.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO core.allocation_policies (organization_id)
  VALUES (p_org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  UPDATE core.allocation_policies SET
    overbook_mode = COALESCE(NULLIF(p_patch->>'overbook_mode', ''), overbook_mode),
    negative_stock_mode = COALESCE(NULLIF(p_patch->>'negative_stock_mode', ''), negative_stock_mode),
    hold_ttl_seconds = COALESCE((p_patch->>'hold_ttl_seconds')::int, hold_ttl_seconds),
    allow_waitlist = COALESCE((p_patch->>'allow_waitlist')::boolean, allow_waitlist),
    enable_safety_stock_alert = COALESCE((p_patch->>'enable_safety_stock_alert')::boolean, enable_safety_stock_alert),
    default_safety_stock = COALESCE((p_patch->>'default_safety_stock')::int, default_safety_stock),
    updated_at = now()
  WHERE organization_id = p_org_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
\$\$;

REVOKE ALL ON FUNCTION core.upsert_allocation_policy(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.upsert_allocation_policy(uuid, jsonb) TO authenticated;

-- ── 3b tax + rounding ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core.tax_policies (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'inclusive'
    CHECK (mode IN ('inclusive','exclusive')),
  rate numeric(8,6) NOT NULL DEFAULT 0
    CHECK (rate >= 0 AND rate <= 1),
  exempt_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.rounding_policies (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'round'
    CHECK (mode IN ('floor','round','ceil')),
  unit integer NOT NULL DEFAULT 1
    CHECK (unit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON core.tax_policies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.tax_policies
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON core.rounding_policies;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.rounding_policies
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.tax_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.rounding_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_tax_policies_select ON core.tax_policies;
CREATE POLICY core_tax_policies_select ON core.tax_policies FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));
DROP POLICY IF EXISTS core_tax_policies_admin ON core.tax_policies;
CREATE POLICY core_tax_policies_admin ON core.tax_policies FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_rounding_policies_select ON core.rounding_policies;
CREATE POLICY core_rounding_policies_select ON core.rounding_policies FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));
DROP POLICY IF EXISTS core_rounding_policies_admin ON core.rounding_policies;
CREATE POLICY core_rounding_policies_admin ON core.rounding_policies FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.tax_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.rounding_policies TO authenticated;

INSERT INTO core.tax_policies (organization_id, mode, rate)
SELECT
  o.id,
  COALESCE(NULLIF(o.settings->'tax_policy'->>'mode', ''), 'inclusive'),
  COALESCE((o.settings->'tax_policy'->>'rate')::numeric, 0)
FROM core.organizations o
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO core.rounding_policies (organization_id)
SELECT o.id FROM core.organizations o
ON CONFLICT (organization_id) DO NOTHING;

CREATE OR REPLACE FUNCTION core.resolve_tax_policy(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS \$\$
DECLARE
  v_row core.tax_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.tax_policies WHERE organization_id = p_org_id;
  IF FOUND THEN
    RETURN jsonb_build_object('mode', v_row.mode, 'rate', v_row.rate, 'exempt_codes', v_row.exempt_codes);
  END IF;
  RETURN jsonb_build_object('mode', 'inclusive', 'rate', 0, 'exempt_codes', '[]'::jsonb);
END;
\$\$;

REVOKE ALL ON FUNCTION core.resolve_tax_policy(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.resolve_tax_policy(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION core.resolve_rounding_policy(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public
AS \$\$
DECLARE
  v_row core.rounding_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM core.rounding_policies WHERE organization_id = p_org_id;
  IF FOUND THEN
    RETURN jsonb_build_object('mode', v_row.mode, 'unit', v_row.unit);
  END IF;
  RETURN jsonb_build_object('mode', 'round', 'unit', 1);
END;
\$\$;

REVOKE ALL ON FUNCTION core.resolve_rounding_policy(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.resolve_rounding_policy(uuid) TO authenticated;

-- ── 3c booking lifecycle catalog ───────────────────────────────────
CREATE TABLE IF NOT EXISTS core.lifecycle_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status_key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain, status_key)
);

CREATE TABLE IF NOT EXISTS core.lifecycle_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  from_status text NOT NULL,
  command text NOT NULL,
  to_status text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain, from_status, command)
);

CREATE TABLE IF NOT EXISTS core.lifecycle_side_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  transition_command text NOT NULL,
  effect_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain, transition_command, effect_key)
);

ALTER TABLE core.lifecycle_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.lifecycle_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.lifecycle_side_effects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_lifecycle_definitions_select ON core.lifecycle_definitions;
CREATE POLICY core_lifecycle_definitions_select ON core.lifecycle_definitions FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));
DROP POLICY IF EXISTS core_lifecycle_definitions_admin ON core.lifecycle_definitions;
CREATE POLICY core_lifecycle_definitions_admin ON core.lifecycle_definitions FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_lifecycle_transitions_select ON core.lifecycle_transitions;
CREATE POLICY core_lifecycle_transitions_select ON core.lifecycle_transitions FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));
DROP POLICY IF EXISTS core_lifecycle_transitions_admin ON core.lifecycle_transitions;
CREATE POLICY core_lifecycle_transitions_admin ON core.lifecycle_transitions FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_lifecycle_side_effects_select ON core.lifecycle_side_effects;
CREATE POLICY core_lifecycle_side_effects_select ON core.lifecycle_side_effects FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));
DROP POLICY IF EXISTS core_lifecycle_side_effects_admin ON core.lifecycle_side_effects;
CREATE POLICY core_lifecycle_side_effects_admin ON core.lifecycle_side_effects FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.lifecycle_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.lifecycle_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.lifecycle_side_effects TO authenticated;

CREATE OR REPLACE FUNCTION core.seed_booking_lifecycle(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS \$\$
BEGIN
  IF p_org_id IS NULL OR NOT core.is_org_member(p_org_id) THEN
    RETURN;
  END IF;

  INSERT INTO core.lifecycle_definitions (organization_id, domain, status_key, label, sort_order, is_terminal)
  VALUES
    (p_org_id, 'booking', 'requested', '요청', 10, false),
    (p_org_id, 'booking', 'confirmed', '확정', 20, false),
    (p_org_id, 'booking', 'cancelled', '취소', 30, true)
  ON CONFLICT (organization_id, domain, status_key) DO NOTHING;

  INSERT INTO core.lifecycle_transitions (organization_id, domain, from_status, command, to_status, is_enabled)
  VALUES
    (p_org_id, 'booking', 'requested', 'confirm', 'confirmed', true),
    (p_org_id, 'booking', 'requested', 'cancel', 'cancelled', true),
    (p_org_id, 'booking', 'confirmed', 'cancel', 'cancelled', true)
  ON CONFLICT (organization_id, domain, from_status, command) DO NOTHING;

  INSERT INTO core.lifecycle_side_effects (organization_id, domain, transition_command, effect_key, is_enabled)
  VALUES
    (p_org_id, 'booking', 'confirm', 'notify', true),
    (p_org_id, 'booking', 'cancel', 'notify', false)
  ON CONFLICT (organization_id, domain, transition_command, effect_key) DO NOTHING;
END;
\$\$;

REVOKE ALL ON FUNCTION core.seed_booking_lifecycle(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.seed_booking_lifecycle(uuid) TO authenticated;

-- seed lifecycle for existing orgs
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM core.organizations LOOP
    PERFORM core.seed_booking_lifecycle(r.id);
  END LOOP;
END;
\$\$;


CREATE OR REPLACE FUNCTION core.apply_stock_movement(
  p_organization_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_movement_type core.stock_movement_type,
  p_quantity NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_stock_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_product_org UUID;
  v_variant_product UUID;
  v_delta NUMERIC(14, 3);
  v_qty_abs NUMERIC(14, 3);
  v_inv core.inventory%ROWTYPE;
  v_after NUMERIC(14, 3);
  v_mov core.stock_movements%ROWTYPE;
  v_ref_type TEXT;
  v_reason TEXT;
  v_loc UUID;
  v_loc_org UUID;
  v_neg_mode TEXT;
  v_stock_warning BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT core.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION '상품을 선택해 주세요.';
  END IF;

  IF p_movement_type = 'transfer' THEN
    RAISE EXCEPTION 'transfer는 transfer_stock_between_locations를 사용하세요.';
  END IF;

  SELECT p.organization_id INTO v_product_org
  FROM core.products p
  WHERE p.id = p_product_id;

  IF v_product_org IS NULL THEN
    RAISE EXCEPTION '상품을 찾을 수 없습니다.';
  END IF;
  IF v_product_org <> p_organization_id THEN
    RAISE EXCEPTION 'product organization_id mismatch';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT v.product_id INTO v_variant_product
    FROM core.product_variants v
    WHERE v.id = p_variant_id;
    IF v_variant_product IS NULL THEN
      RAISE EXCEPTION '선택한 옵션이 상품과 일치하지 않습니다.';
    END IF;
    IF v_variant_product <> p_product_id THEN
      RAISE EXCEPTION '선택한 옵션이 상품과 일치하지 않습니다.';
    END IF;
  END IF;

  v_loc := p_stock_location_id;
  IF v_loc IS NULL THEN
    v_loc := core.ensure_central_stock_location_id(p_organization_id);
  ELSE
    SELECT organization_id INTO v_loc_org
    FROM core.stock_locations
    WHERE id = v_loc AND is_active = true;
    IF v_loc_org IS NULL OR v_loc_org <> p_organization_id THEN
      RAISE EXCEPTION '유효하지 않은 재고 위치입니다.';
    END IF;
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_ref_type := NULLIF(btrim(COALESCE(p_reference_type, '')), '');

  IF p_movement_type = 'inbound' THEN
    v_qty_abs := COALESCE(p_quantity, 0);
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '입고 수량은 0보다 커야 합니다.';
    END IF;
    v_delta := v_qty_abs;

  ELSIF p_movement_type = 'adjustment' THEN
    IF p_quantity IS NULL
       OR p_quantity <> trunc(p_quantity)
       OR trunc(p_quantity) = 0 THEN
      RAISE EXCEPTION '조정 수량은 0이 아닌 정수여야 합니다.';
    END IF;
    v_delta := trunc(p_quantity);
    IF v_reason IS NULL THEN
      RAISE EXCEPTION '조정 사유를 입력해 주세요.';
    END IF;

  ELSIF p_movement_type = 'sale' THEN
    v_qty_abs := trunc(COALESCE(p_quantity, 0));
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '판매 차감 수량은 0보다 커야 합니다.';
    END IF;
    IF p_reference_id IS NULL THEN
      RAISE EXCEPTION '판매 참조(saleId)가 필요합니다.';
    END IF;
    IF v_ref_type IS NULL OR v_ref_type NOT IN ('sale', 'textbook_sale') THEN
      v_ref_type := 'sale';
    END IF;
    v_delta := -v_qty_abs;

  ELSIF p_movement_type = 'return' THEN
    v_qty_abs := trunc(COALESCE(p_quantity, 0));
    IF v_qty_abs <= 0 THEN
      RAISE EXCEPTION '반품 복구 수량은 0보다 커야 합니다.';
    END IF;
    IF p_reference_id IS NULL THEN
      RAISE EXCEPTION '반품 참조(saleReturnId)가 필요합니다.';
    END IF;
    IF v_ref_type IS NULL OR v_ref_type NOT IN ('sale_return', 'textbook_sale') THEN
      v_ref_type := 'sale_return';
    END IF;
    v_delta := v_qty_abs;

  ELSE
    RAISE EXCEPTION 'unsupported movement_type';
  END IF;

  IF p_variant_id IS NULL THEN
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, NULL, 0, v_loc)
    ON CONFLICT (organization_id, product_id, stock_location_id)
      WHERE (variant_id IS NULL AND product_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND product_id = p_product_id
      AND variant_id IS NULL
      AND stock_location_id = v_loc
    FOR UPDATE;
  ELSE
    INSERT INTO core.inventory (organization_id, product_id, variant_id, quantity, stock_location_id)
    VALUES (p_organization_id, p_product_id, p_variant_id, 0, v_loc)
    ON CONFLICT (organization_id, variant_id, stock_location_id)
      WHERE (variant_id IS NOT NULL)
    DO NOTHING;

    SELECT * INTO v_inv
    FROM core.inventory
    WHERE organization_id = p_organization_id
      AND variant_id = p_variant_id
      AND stock_location_id = v_loc
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION '재고 행을 준비하지 못했습니다.';
  END IF;

  v_after := v_inv.quantity + v_delta;
  v_neg_mode := COALESCE(
    (core.resolve_allocation_policy(p_organization_id)->>'negative_stock_mode'),
    'forbid'
  );
  v_stock_warning := false;
  IF v_after < 0 THEN
    IF v_neg_mode = 'forbid' THEN
      IF p_movement_type = 'sale' THEN
        RAISE EXCEPTION '재고가 부족합니다. (현재 %)',
          trim(to_char(v_inv.quantity, 'FM999999999999990.999'));
      ELSIF p_movement_type = 'adjustment' THEN
        RAISE EXCEPTION '조정 후 재고가 음수가 됩니다. (현재 %, 조정 %)',
          trim(to_char(v_inv.quantity, 'FM999999999999990.999')),
          trim(to_char(v_delta, 'FM999999999999990.999'));
      ELSE
        RAISE EXCEPTION '재고가 음수가 됩니다.';
      END IF;
    ELSIF v_neg_mode = 'warn' THEN
      v_stock_warning := true;
    END IF;
    -- allow / warn: proceed with negative qty
  END IF;

  INSERT INTO core.stock_movements (
    organization_id,
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reason,
    stock_location_id
  ) VALUES (
    p_organization_id,
    p_product_id,
    p_variant_id,
    p_movement_type,
    v_delta,
    v_ref_type,
    p_reference_id,
    v_reason,
    v_loc
  )
  RETURNING * INTO v_mov;

  UPDATE core.inventory
  SET quantity = v_after,
      updated_at = now()
  WHERE id = v_inv.id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '재고 갱신에 실패했습니다.';
  END IF;

  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_mov.id,
      'organization_id', v_mov.organization_id,
      'product_id', v_mov.product_id,
      'variant_id', v_mov.variant_id,
      'movement_type', v_mov.movement_type,
      'quantity', v_mov.quantity,
      'reference_type', v_mov.reference_type,
      'reference_id', v_mov.reference_id,
      'reason', v_mov.reason,
      'stock_location_id', v_mov.stock_location_id,
      'created_at', v_mov.created_at
    ),
    'quantity_after', v_after,
    'stock_location_id', v_loc,
    'negative_stock_warning', v_stock_warning,
    'negative_stock_mode', v_neg_mode
  );
END;
$$;


CREATE OR REPLACE FUNCTION core.book_schedule_slot(
  p_tenant_id UUID,
  p_schedule_id UUID,
  p_customer_id UUID,
  p_pass_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_schedule RECORD;
  v_customer RECORD;
  v_pass RECORD;
  v_booked_count INT;
  v_reservation_id UUID;
  v_overbook_mode TEXT;
  v_allow_waitlist BOOLEAN;
  v_overbooked BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REQUIRED: 테넌트 식별자(p_tenant_id)가 필요합니다.';
  END IF;

  IF p_schedule_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'SCHEDULE_OR_CUSTOMER_REQUIRED: 일정과 고객 식별자가 필요합니다.';
  END IF;

  -- 1) 타임슬롯 행 배타적 잠금(FOR UPDATE): 동시 접근 시 직렬화하여 오버부킹 원천 차단
  SELECT
    s.id,
    s.organization_id,
    s.is_bookable,
    s.max_capacity,
    s.starts_at,
    s.ends_at,
    o.is_active
  INTO v_schedule
  FROM core.schedules s
  JOIN core.organizations o ON o.id = s.organization_id
  WHERE s.id = p_schedule_id AND s.organization_id = p_tenant_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_FOUND: 예약 대상을 찾을 수 없거나 테넌트가 일치하지 않습니다.';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'ORGANIZATION_INACTIVE: 비활성화된 사업장입니다.';
  END IF;

  IF NOT v_schedule.is_bookable THEN
    RAISE EXCEPTION 'SCHEDULE_NOT_BOOKABLE: 예약 가능한 일정이 아닙니다.';
  END IF;

  IF v_schedule.starts_at < now() THEN
    RAISE EXCEPTION 'CANNOT_BOOK_PAST_SCHEDULE: 지난 일정은 예약할 수 없습니다.';
  END IF;

  -- 2) 고객 소속 및 유효성 확인
  SELECT
    c.id,
    c.organization_id,
    c.name,
    c.phone
  INTO v_customer
  FROM core.customers c
  WHERE c.id = p_customer_id AND c.organization_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_NOT_FOUND: 고객 정보를 찾을 수 없습니다.';
  END IF;

  -- 3) 중복 예약 방지 확인
  IF EXISTS (
    SELECT 1
    FROM core.reservations
    WHERE schedule_id = p_schedule_id
      AND customer_id = p_customer_id
      AND status IN ('requested', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED: 해당 고객은 이미 이 일정에 예약되어 있습니다.';
  END IF;

  -- 4) 잔여석(capacity) 카운트 검증: 잠금 상태에서 확인하므로 Race Condition 차단
  SELECT COUNT(*)
  INTO v_booked_count
  FROM core.reservations
  WHERE schedule_id = p_schedule_id
    AND status IN ('requested', 'confirmed');

  v_overbook_mode := COALESCE(
    (core.resolve_allocation_policy(p_tenant_id)->>'overbook_mode'),
    'forbid'
  );
  v_allow_waitlist := COALESCE(
    (core.resolve_allocation_policy(p_tenant_id)->>'allow_waitlist')::boolean,
    true
  );
  v_overbooked := false;
  IF v_booked_count >= v_schedule.max_capacity THEN
    IF v_overbook_mode = 'forbid' THEN
      IF v_allow_waitlist THEN
        RAISE EXCEPTION 'CAPACITY_EXCEEDED_WAITLIST: 예약 정원(%명)이 마감되었습니다. 대기 접수를 이용하세요.', v_schedule.max_capacity;
      END IF;
      RAISE EXCEPTION 'CAPACITY_EXCEEDED: 예약 정원(%명)이 모두 마감되었습니다.', v_schedule.max_capacity;
    END IF;
    -- warn / allow: 초과예약 허용
    v_overbooked := true;
  END IF;

  -- 5) 수강권 원자적 차감 (p_pass_id 제공 시)
  IF p_pass_id IS NOT NULL THEN
    -- session_passes 확인
    SELECT
      p.id,
      p.organization_id,
      p.customer_id,
      p.total_sessions,
      p.used_sessions,
      p.status,
      p.expires_at
    INTO v_pass
    FROM core.session_passes p
    WHERE p.id = p_pass_id AND p.organization_id = p_tenant_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_pass.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'PASS_OWNERSHIP_MISMATCH: 수강권 소유자가 일치하지 않습니다.';
      END IF;

      IF v_pass.status <> 'active' THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 사용 가능한 활성 상태의 수강권이 아닙니다.';
      END IF;

      IF v_pass.expires_at IS NOT NULL AND v_pass.expires_at < now() THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 유효기간이 만료된 수강권입니다.';
      END IF;

      IF v_pass.used_sessions >= v_pass.total_sessions THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 잔여 수강권 횟수가 부족합니다.';
      END IF;

      UPDATE core.session_passes
      SET used_sessions = used_sessions + 1,
          status = CASE WHEN used_sessions + 1 >= total_sessions THEN 'exhausted' ELSE 'active' END,
          updated_at = now()
      WHERE id = p_pass_id;
    ELSE
      -- core.passes 확인
      SELECT
        cp.id,
        cp.tenant_id,
        cp.customer_id,
        cp.remaining_count,
        cp.status,
        cp.expires_at,
        cp.is_active
      INTO v_pass
      FROM core.passes cp
      WHERE cp.id = p_pass_id AND cp.tenant_id = p_tenant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'PASS_NOT_FOUND: 수강권/이용권을 찾을 수 없습니다.';
      END IF;

      IF v_pass.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'PASS_OWNERSHIP_MISMATCH: 이용권 소유자가 일치하지 않습니다.';
      END IF;

      IF v_pass.is_active IS NOT TRUE OR v_pass.status = 'PAUSED' THEN
        RAISE EXCEPTION 'PASS_NOT_USABLE: 사용 가능한 활성 상태의 이용권이 아닙니다.';
      END IF;

      IF v_pass.expires_at < CURRENT_DATE THEN
        UPDATE core.passes SET status = 'EXPIRED', updated_at = now() WHERE id = p_pass_id;
        RAISE EXCEPTION 'PASS_NOT_USABLE: 유효기간이 만료된 이용권입니다.';
      END IF;

      IF v_pass.remaining_count <= 0 THEN
        UPDATE core.passes SET status = 'EXHAUSTED', updated_at = now() WHERE id = p_pass_id;
        RAISE EXCEPTION 'PASS_NOT_USABLE: 잔여 이용권 횟수가 부족합니다.';
      END IF;

      UPDATE core.passes
      SET remaining_count = remaining_count - 1,
          status = CASE WHEN remaining_count - 1 <= 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END,
          updated_at = now()
      WHERE id = p_pass_id;
    END IF;
  END IF;

  -- 6) 예약 레코드 생성 (단일 트랜잭션 보장)
  INSERT INTO core.reservations (
    organization_id,
    schedule_id,
    customer_id,
    session_pass_id,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_schedule.organization_id,
    p_schedule_id,
    p_customer_id,
    p_pass_id,
    'confirmed',
    '예약 비관적 락(FOR UPDATE) 원자적 생성',
    now(),
    now()
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'schedule_id', p_schedule_id,
    'customer_id', p_customer_id,
    'pass_id', p_pass_id,
    'booked_count', v_booked_count + 1,
    'max_capacity', v_schedule.max_capacity,
    'remaining_capacity', GREATEST(0, v_schedule.max_capacity - (v_booked_count + 1)),
    'overbooked', v_overbooked,
    'overbook_mode', v_overbook_mode
  );
END;
$$;



GRANT EXECUTE ON FUNCTION core.book_schedule_slot(UUID, UUID, UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION core.apply_stock_movement(
  UUID, UUID, UUID, core.stock_movement_type, NUMERIC, TEXT, UUID, TEXT, UUID
) TO authenticated;

COMMIT;
