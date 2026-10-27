-- 결재 담당자는 기안자가 지정한 사람으로 두고, 안전 권한 키로 제한하지 않는다.
-- 반려 사유는 문서 snapshot에 남겨 수정 후 다시 상신할 수 있게 한다.

BEGIN;

CREATE OR REPLACE FUNCTION core.can_review_risk_assessment(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION core.can_approve_risk_assessment(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
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
    IF NOT core.is_org_member(NEW.organization_id) THEN
      RAISE EXCEPTION 'forbidden'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
    IF OLD.created_by = auth.uid() OR core.is_org_owner_or_admin(OLD.organization_id) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'only the author can edit a draft'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION core.reject_risk_assessment_step(
  p_assessment_id UUID,
  p_step_order INT,
  p_reject_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_step core.document_approval_lines%ROWTYPE;
  v_uid UUID := auth.uid();
  v_reason TEXT := btrim(p_reject_reason);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF v_reason IS NULL OR length(v_reason) = 0 THEN
    RAISE EXCEPTION 'reject reason required' USING ERRCODE = '42501';
  END IF;
  IF p_step_order NOT IN (2, 3) THEN
    RAISE EXCEPTION 'invalid step_order' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc FROM core.risk_assessments WHERE id = p_assessment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment not found' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_step
  FROM core.document_approval_lines
  WHERE assessment_id = p_assessment_id AND step_order = p_step_order
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval step not found' USING ERRCODE = '42501';
  END IF;
  IF v_step.assignee_id <> v_uid THEN
    RAISE EXCEPTION 'assignee mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT core.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE core.document_approval_lines
  SET action_status = 'REJECTED',
      comment = v_reason,
      action_at = now()
  WHERE id = v_step.id;

  UPDATE core.document_approval_lines
  SET action_status = 'WAIT',
      comment = NULL,
      signature_data = NULL,
      action_at = NULL
  WHERE assessment_id = p_assessment_id
    AND step_order > p_step_order;

  UPDATE core.risk_assessments
  SET status = 'DRAFT',
      updated_at = now(),
      snapshot_payload = COALESCE(snapshot_payload, '{}'::jsonb) || jsonb_build_object(
        'rejectionHistory',
        COALESCE(snapshot_payload->'rejectionHistory', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid()::text,
            'stepOrder', p_step_order,
            'stepLabel', CASE WHEN p_step_order = 3 THEN '최종 승인' ELSE '검토' END,
            'reason', v_reason,
            'rejectedBy', v_uid,
            'rejectedAt', to_jsonb(now())
          )
        )
      )
  WHERE id = p_assessment_id;

  INSERT INTO core.notifications (
    organization_id, type, title, message, target_type, target_id, metadata
  ) VALUES (
    v_doc.organization_id,
    'risk_assessment_rejected',
    '위험성평가 반려',
    v_reason,
    'risk_assessment',
    p_assessment_id,
    jsonb_build_object(
      'step_order', p_step_order,
      'reason', v_reason,
      'author_id', v_doc.created_by
    )
  );

  PERFORM core._fail_closed_risk_audit(
    v_doc.organization_id,
    'ASSESSMENT_REJECTED',
    p_assessment_id,
    jsonb_build_object('step_order', p_step_order, 'reason', v_reason)
  );

  RETURN jsonb_build_object('success', true, 'status', 'DRAFT');
END;
$$;

COMMIT;
