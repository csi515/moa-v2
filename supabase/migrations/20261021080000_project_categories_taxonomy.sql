-- ==============================================================================
-- 테넌트 사용자 정의 프로젝트 분류(택소노미)
-- - core.project_categories: 사업장이 자유롭게 추가·이름변경·비활성
-- - core.mbo_projects.category_id: 프로젝트 연결 (NULL 허용 = 미분류)
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS core.project_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  category_key VARCHAR(64) NOT NULL,
  label VARCHAR(64) NOT NULL,
  color VARCHAR(16),
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_categories_key_not_blank CHECK (length(btrim(category_key)) > 0),
  CONSTRAINT project_categories_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT uq_project_categories_org_key UNIQUE (organization_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_project_categories_org_active
  ON core.project_categories (organization_id, is_active, sort_order);

COMMENT ON TABLE core.project_categories IS
  '사업장 사용자 정의 프로젝트 분류 마스터. 하드 삭제 대신 is_active=false 권장.';

ALTER TABLE core.mbo_projects
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES core.project_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mbo_projects_org_category
  ON core.mbo_projects (organization_id, category_id);

ALTER TABLE core.project_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_categories_member_all ON core.project_categories;
CREATE POLICY project_categories_member_all ON core.project_categories
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.project_categories TO authenticated;

-- 연구소 프리셋 시드용: 활성 org에 기본 분류가 없을 때 호출 가능한 헬퍼
CREATE OR REPLACE FUNCTION core.ensure_default_project_categories(p_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  IF NOT core.is_org_member(p_org) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO core.project_categories (organization_id, category_key, label, color, sort_order)
  VALUES
    (p_org, 'research', '연구', '#4f46e5', 10),
    (p_org, 'quality', '품질', '#059669', 20),
    (p_org, 'technology', '기술', '#0284c7', 30),
    (p_org, 'patent', '특허', '#c026d3', 40),
    (p_org, 'safety', '안전', '#dc2626', 50)
  ON CONFLICT (organization_id, category_key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION core.ensure_default_project_categories(UUID) TO authenticated;

COMMIT;
