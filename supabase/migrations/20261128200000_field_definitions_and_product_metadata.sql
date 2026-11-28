-- Phase 1: 테넌트 커스텀 필드 정의 + 상품 metadata + 카테고리 계층
-- docs/MOA_AGNOSTIC_ERP_PHASE1_SPEC.md

BEGIN;

CREATE TABLE IF NOT EXISTS core.field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL
    CHECK (data_type IN ('text','number','select','boolean','date','textarea','json')),
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  description text,
  options jsonb,
  default_value jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_definitions_entity_type_chk
    CHECK (entity_type IN (
      'customer','student','product','resource',
      'task','consultation','policy','checklist','generic'
    ))
);

COMMENT ON TABLE core.field_definitions IS
  '테넌트별 엔티티 커스텀 필드 스키마. 값은 customers.metadata 등 UMS에 저장.';

CREATE UNIQUE INDEX IF NOT EXISTS field_definitions_org_entity_key_alive_uidx
  ON core.field_definitions (organization_id, entity_type, key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS field_definitions_org_entity_active_idx
  ON core.field_definitions (organization_id, entity_type, is_active)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at ON core.field_definitions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON core.field_definitions
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_field_definitions_select ON core.field_definitions;
CREATE POLICY core_field_definitions_select
  ON core.field_definitions
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id) OR core.is_org_admin(organization_id));

DROP POLICY IF EXISTS core_field_definitions_admin ON core.field_definitions;
CREATE POLICY core_field_definitions_admin
  ON core.field_definitions
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.field_definitions TO authenticated;

-- 상품 메타데이터 (커스텀 필드 값 저장)
ALTER TABLE core.products
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN core.products.metadata IS 'UMS/커스텀 필드 및 확장 속성';

-- 카테고리 1단 부모 (무한 트리는 parent_id 재귀로 확장 가능)
ALTER TABLE core.product_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES core.product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS product_categories_org_parent_idx
  ON core.product_categories (organization_id, parent_id);

COMMENT ON COLUMN core.product_categories.parent_id IS '상위 카테고리 (NULL=루트)';

-- 업종 프리셋 템플릿을 org에 idempotent 시드 (클라이언트 JSON 배열 전달)
CREATE OR REPLACE FUNCTION core.seed_field_definitions_from_preset(
  p_org_id uuid,
  p_fields jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_item jsonb;
  v_count integer := 0;
  v_sort integer := 0;
  v_entity text;
  v_key text;
  v_existing uuid;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id required';
  END IF;
  IF NOT core.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'not a member of organization';
  END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_fields)
  LOOP
    v_key := NULLIF(trim(v_item->>'key'), '');
    IF v_key IS NULL THEN
      CONTINUE;
    END IF;
    v_entity := COALESCE(NULLIF(trim(v_item->>'entity_type'), ''), 'customer');
    v_sort := v_sort + 10;

    SELECT id INTO v_existing
    FROM core.field_definitions
    WHERE organization_id = p_org_id
      AND entity_type = v_entity
      AND key = v_key
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      -- 이미 활성 정의가 있으면 시드가 테넌트 편집을 덮어쓰지 않음
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    -- soft-deleted 동일 키 복구
    UPDATE core.field_definitions
    SET
      label = COALESCE(v_item->>'label', key),
      data_type = COALESCE(v_item->>'data_type', v_item->>'type', 'text'),
      required = COALESCE((v_item->>'required')::boolean, false),
      placeholder = v_item->>'placeholder',
      description = v_item->>'description',
      options = CASE WHEN v_item ? 'options' THEN v_item->'options' ELSE NULL END,
      default_value = CASE
        WHEN v_item ? 'defaultValue' THEN v_item->'defaultValue'
        WHEN v_item ? 'default_value' THEN v_item->'default_value'
        ELSE NULL
      END,
      sort_order = COALESCE((v_item->>'sort_order')::integer, v_sort),
      is_active = true,
      deleted_at = NULL,
      updated_at = now()
    WHERE organization_id = p_org_id
      AND entity_type = v_entity
      AND key = v_key
      AND deleted_at IS NOT NULL;

    IF FOUND THEN
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO core.field_definitions (
      organization_id, entity_type, key, label, data_type, required,
      placeholder, description, options, default_value, sort_order, is_active
    ) VALUES (
      p_org_id,
      v_entity,
      v_key,
      COALESCE(v_item->>'label', v_key),
      COALESCE(v_item->>'data_type', v_item->>'type', 'text'),
      COALESCE((v_item->>'required')::boolean, false),
      v_item->>'placeholder',
      v_item->>'description',
      CASE WHEN v_item ? 'options' THEN v_item->'options' ELSE NULL END,
      CASE
        WHEN v_item ? 'defaultValue' THEN v_item->'defaultValue'
        WHEN v_item ? 'default_value' THEN v_item->'default_value'
        ELSE NULL
      END,
      COALESCE((v_item->>'sort_order')::integer, v_sort),
      true
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION core.seed_field_definitions_from_preset(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.seed_field_definitions_from_preset(uuid, jsonb) TO authenticated;

COMMIT;
