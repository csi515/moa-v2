-- 작업표준 초안은 작성자·검토 권한자만 수정하고,
-- 결재 권한은 직급 JSON(배열/객체)의 안전 권한 키도 인정한다.

BEGIN;

CREATE OR REPLACE FUNCTION core.json_grants_permission(p_permissions JSONB, p_needles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text TEXT;
  v_key TEXT;
BEGIN
  IF p_permissions IS NULL OR p_needles IS NULL THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_permissions) = 'array' THEN
    FOR v_text IN SELECT jsonb_array_elements_text(p_permissions)
    LOOP
      IF v_text = ANY (p_needles) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  IF jsonb_typeof(p_permissions) = 'object' THEN
    FOREACH v_key IN ARRAY p_needles
    LOOP
      IF jsonb_typeof(p_permissions -> v_key) = 'boolean'
         AND (p_permissions ->> v_key) = 'true' THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION core.member_has_risk_permission(p_org UUID, p_needles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    LEFT JOIN core.tenant_roles tr ON tr.id = m.custom_role_id
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND (
        core.json_grants_permission(tr.permissions, p_needles)
        OR core.json_grants_permission(r.permissions, p_needles)
      )
  );
$$;

CREATE OR REPLACE FUNCTION core.can_review_risk_assessment(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'safety.assessment.review')
    OR core.member_has_risk_permission(
      p_org,
      ARRAY['*', 'safety.assessment.review', 'safety:assessment:review', 'sop_risk_assessment:*']
    )
    OR EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = p_org
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role IN ('owner', 'admin', 'manager')
    );
$$;

CREATE OR REPLACE FUNCTION core.can_approve_risk_assessment(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'safety.assessment.approve')
    OR core.member_has_risk_permission(
      p_org,
      ARRAY['*', 'safety.assessment.approve', 'safety:assessment:approve', 'sop_risk_assessment:*']
    )
    OR EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = p_org
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role = 'owner'
    );
$$;

CREATE OR REPLACE FUNCTION core.risk_assessments_guard_draft_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'DRAFT' THEN
      RAISE EXCEPTION 'new risk assessments must start as DRAFT'
        USING ERRCODE = '42501';
    END IF;
    IF auth.uid() IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'draft author must be the current user'
        USING ERRCODE = '42501';
    END IF;
    IF NOT (
      core.is_org_owner_or_admin(NEW.organization_id)
      OR core.member_has_risk_permission(
        NEW.organization_id,
        ARRAY['*', 'safety.assessment.review', 'safety:assessment:review', 'sop_risk_assessment:*']
      )
      OR EXISTS (
        SELECT 1 FROM core.organization_members m
        WHERE m.organization_id = NEW.organization_id
          AND m.user_id = auth.uid()
          AND m.is_active = true
          AND m.role IN ('owner', 'admin', 'manager')
      )
    ) THEN
      RAISE EXCEPTION 'risk assessment draft create permission denied'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
    IF OLD.created_by = auth.uid()
       OR core.is_org_owner_or_admin(OLD.organization_id)
       OR core.member_has_risk_permission(
         OLD.organization_id,
         ARRAY['*', 'safety.assessment.review', 'safety:assessment:review', 'sop_risk_assessment:*']
       )
       OR EXISTS (
         SELECT 1 FROM core.organization_members m
         WHERE m.organization_id = OLD.organization_id
           AND m.user_id = auth.uid()
           AND m.is_active = true
           AND m.role IN ('owner', 'admin', 'manager')
       ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'only the author or a safety reviewer can edit a draft'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_assessments_draft_editor ON core.risk_assessments;
CREATE TRIGGER trg_risk_assessments_draft_editor
  BEFORE INSERT OR UPDATE ON core.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION core.risk_assessments_guard_draft_editor();

REVOKE ALL ON FUNCTION core.json_grants_permission(JSONB, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.member_has_risk_permission(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION core.risk_assessments_guard_draft_editor() FROM PUBLIC, anon, authenticated;

COMMIT;
