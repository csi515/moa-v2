-- ==============================================================================
-- 작업표준·위험성평가 3단계 결재선(작성-검토-승인) · WORM 개정 이력 · 현장 재서약
--
-- 1) core.risk_assessments — 문서 헤더(상태 머신)
-- 2) core.document_approval_lines — 다단계 결재선
-- 3) core.risk_assessment_revisions — WORM 개정 스냅샷
-- 4) core.risk_assessment_worker_repledges — 개정 시 작업자 재서약
-- 5) 원자 RPC: submit / approve / reject / revise (Fail-Closed audit)
-- ==============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. 메인 문서 테이블
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL,
  document_no VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  process_name VARCHAR(64) NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_by UUID NOT NULL,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occasional_review_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT risk_assessments_status_check CHECK (
    status IN ('DRAFT', 'REVIEW_PENDING', 'APPROVAL_PENDING', 'APPROVED', 'LOCKED')
  ),
  CONSTRAINT risk_assessments_document_no_org_unique UNIQUE (organization_id, document_no)
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_org_status
  ON core.risk_assessments (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_org_dept
  ON core.risk_assessments (organization_id, department_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_by
  ON core.risk_assessments (organization_id, created_by);

COMMENT ON TABLE core.risk_assessments IS
  '작업표준·위험성평가 문서 헤더. 3단계 결재(작성-검토-승인) 상태 머신 소유.';

-- ---------------------------------------------------------------------------
-- 2. 다단계 결재선
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.document_approval_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type VARCHAR(16) NOT NULL,
  assignee_id UUID NOT NULL,
  assignee_name TEXT,
  action_status VARCHAR(16) NOT NULL DEFAULT 'WAIT',
  comment TEXT,
  signature_data TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_approval_lines_step_order_check CHECK (step_order IN (1, 2, 3)),
  CONSTRAINT document_approval_lines_step_type_check CHECK (
    step_type IN ('DRAFT', 'REVIEW', 'APPROVE')
  ),
  CONSTRAINT document_approval_lines_action_status_check CHECK (
    action_status IN ('WAIT', 'APPROVED', 'REJECTED')
  ),
  CONSTRAINT uq_document_approval_line_order UNIQUE (assessment_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_document_approval_lines_assignee
  ON core.document_approval_lines (organization_id, assignee_id, action_status);

COMMENT ON TABLE core.document_approval_lines IS
  '위험성평가 문서별 3단계 결재선(1작성/2검토/3승인) 및 자필 서명.';

-- ---------------------------------------------------------------------------
-- 3. WORM 개정 이력 스냅샷
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.risk_assessment_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  revision_type VARCHAR(16) NOT NULL,
  revision_reason TEXT NOT NULL,
  snapshot_payload JSONB NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT risk_assessment_revisions_type_check CHECK (
    revision_type IN ('INITIAL', 'PERIODIC', 'OCCASIONAL')
  ),
  CONSTRAINT uq_risk_assessment_revision_version UNIQUE (assessment_id, version)
);

CREATE INDEX IF NOT EXISTS idx_risk_assessment_revisions_assessment
  ON core.risk_assessment_revisions (assessment_id, version DESC);

COMMENT ON TABLE core.risk_assessment_revisions IS
  '승인 완료 위험성평가 불변(WORM) 개정 스냅샷. UPDATE/DELETE 영구 차단.';

-- ---------------------------------------------------------------------------
-- 4. 현장 작업자 재서약 (개정 버전 연동)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.risk_assessment_worker_repledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES core.risk_assessments(id) ON DELETE CASCADE,
  department_id UUID NULL,
  required_version INT NOT NULL,
  worker_user_id UUID NOT NULL,
  pledged_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_risk_repledge_worker_version UNIQUE (assessment_id, worker_user_id, required_version)
);

CREATE INDEX IF NOT EXISTS idx_risk_repledge_pending
  ON core.risk_assessment_worker_repledges (organization_id, worker_user_id)
  WHERE pledged_at IS NULL;

COMMENT ON TABLE core.risk_assessment_worker_repledges IS
  '작업표준 개정(APPROVED) 시 해당 공정 작업자 TBM 재서약 대기/완료 대장.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE core.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.document_approval_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.risk_assessment_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.risk_assessment_worker_repledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS risk_assessments_member_all ON core.risk_assessments;
CREATE POLICY risk_assessments_member_all ON core.risk_assessments
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS document_approval_lines_member_all ON core.document_approval_lines;
CREATE POLICY document_approval_lines_member_all ON core.document_approval_lines
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

DROP POLICY IF EXISTS risk_assessment_revisions_select ON core.risk_assessment_revisions;
CREATE POLICY risk_assessment_revisions_select ON core.risk_assessment_revisions
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS risk_assessment_worker_repledges_member_all ON core.risk_assessment_worker_repledges;
CREATE POLICY risk_assessment_worker_repledges_member_all ON core.risk_assessment_worker_repledges
  FOR ALL TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.document_approval_lines TO authenticated;
GRANT SELECT ON core.risk_assessment_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.risk_assessment_worker_repledges TO authenticated;

-- ---------------------------------------------------------------------------
-- WORM / 잠금 트리거
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.risk_assessment_revisions_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'risk_assessment_revisions are immutable (WORM)'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_assessment_revisions_immutable ON core.risk_assessment_revisions;
CREATE TRIGGER trg_risk_assessment_revisions_immutable
  BEFORE UPDATE OR DELETE ON core.risk_assessment_revisions
  FOR EACH ROW
  EXECUTE FUNCTION core.risk_assessment_revisions_immutable();

CREATE OR REPLACE FUNCTION core.risk_assessments_block_locked_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('risk_assessment.allow_revise', true) = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('APPROVED', 'LOCKED') THEN
      RAISE EXCEPTION 'approved or locked risk assessments cannot be deleted'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('APPROVED', 'LOCKED') THEN
    RAISE EXCEPTION 'approved or locked risk assessments cannot be updated; use revise RPC'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_assessments_block_locked ON core.risk_assessments;
CREATE TRIGGER trg_risk_assessments_block_locked
  BEFORE UPDATE OR DELETE ON core.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION core.risk_assessments_block_locked_mutation();

-- ---------------------------------------------------------------------------
-- audit_logs entity_type 확장
-- ---------------------------------------------------------------------------
ALTER TABLE core.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE core.audit_logs ADD CONSTRAINT audit_logs_entity_type_check CHECK (
  entity_type = ANY (ARRAY[
    'customer', 'staff', 'booking', 'reservation', 'payment', 'refund',
    'pass', 'membership', 'sale', 'inventory', 'permissions', 'guardian_link',
    'mbo_goal', 'risk_assessment'
  ]::TEXT[])
);

-- ---------------------------------------------------------------------------
-- 권한 헬퍼: 검토/승인
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.can_review_risk_assessment(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT core.is_org_owner_or_admin(p_org)
    OR core.member_has_org_permission(p_org, 'safety.assessment.review')
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
    OR EXISTS (
      SELECT 1 FROM core.organization_members m
      WHERE m.organization_id = p_org
        AND m.user_id = auth.uid()
        AND m.is_active = true
        AND m.role = 'owner'
    );
$$;

CREATE OR REPLACE FUNCTION core._fail_closed_risk_audit(
  p_org UUID,
  p_action TEXT,
  p_entity_id UUID,
  p_after JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  INSERT INTO core.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) VALUES (
    p_org,
    auth.uid(),
    p_action,
    'risk_assessment',
    p_entity_id::text,
    p_after
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'fail-closed: audit_logs insert failed for % (%)',
      p_action, SQLERRM
      USING ERRCODE = '42501';
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC 1: 검토 요청
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.submit_risk_assessment_for_review(
  p_assessment_id UUID,
  p_reviewer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_reviewer_id IS NULL THEN
    RAISE EXCEPTION 'reviewer required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc FROM core.risk_assessments WHERE id = p_assessment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment not found' USING ERRCODE = '42501';
  END IF;
  IF NOT core.is_org_member(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_doc.created_by <> v_uid AND NOT core.is_org_owner_or_admin(v_doc.organization_id) THEN
    RAISE EXCEPTION 'only author can submit for review' USING ERRCODE = '42501';
  END IF;
  IF v_doc.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'invalid status for submit' USING ERRCODE = '42501';
  END IF;

  UPDATE core.risk_assessments
  SET status = 'REVIEW_PENDING', updated_at = now()
  WHERE id = p_assessment_id;

  INSERT INTO core.document_approval_lines (
    assessment_id, organization_id, step_order, step_type,
    assignee_id, action_status, action_at
  ) VALUES (
    p_assessment_id, v_doc.organization_id, 1, 'DRAFT',
    v_uid, 'APPROVED', now()
  )
  ON CONFLICT (assessment_id, step_order) DO UPDATE
  SET assignee_id = EXCLUDED.assignee_id,
      action_status = 'APPROVED',
      action_at = now();

  INSERT INTO core.document_approval_lines (
    assessment_id, organization_id, step_order, step_type,
    assignee_id, action_status
  ) VALUES (
    p_assessment_id, v_doc.organization_id, 2, 'REVIEW',
    p_reviewer_id, 'WAIT'
  )
  ON CONFLICT (assessment_id, step_order) DO UPDATE
  SET assignee_id = EXCLUDED.assignee_id,
      action_status = 'WAIT',
      comment = NULL,
      signature_data = NULL,
      action_at = NULL;

  PERFORM core._fail_closed_risk_audit(
    v_doc.organization_id,
    'ASSESSMENT_SUBMITTED_FOR_REVIEW',
    p_assessment_id,
    jsonb_build_object('reviewer_id', p_reviewer_id, 'status', 'REVIEW_PENDING')
  );

  RETURN jsonb_build_object('success', true, 'status', 'REVIEW_PENDING');
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC 2: 검토/승인 단계 처리
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.approve_risk_assessment_step(
  p_assessment_id UUID,
  p_step_order INT,
  p_comment TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL,
  p_next_assignee_id UUID DEFAULT NULL
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
  v_revision_type TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_step_order NOT IN (2, 3) THEN
    RAISE EXCEPTION 'invalid step_order' USING ERRCODE = '42501';
  END IF;
  IF p_signature IS NULL OR length(btrim(p_signature)) < 8 THEN
    RAISE EXCEPTION 'signature required' USING ERRCODE = '42501';
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
  IF v_step.action_status <> 'WAIT' THEN
    RAISE EXCEPTION 'step already processed' USING ERRCODE = '42501';
  END IF;

  IF p_step_order = 2 THEN
    IF v_doc.status <> 'REVIEW_PENDING' THEN
      RAISE EXCEPTION 'invalid status for review' USING ERRCODE = '42501';
    END IF;
    IF NOT core.can_review_risk_assessment(v_doc.organization_id) THEN
      RAISE EXCEPTION 'review permission denied' USING ERRCODE = '42501';
    END IF;
    IF p_next_assignee_id IS NULL THEN
      RAISE EXCEPTION 'final approver (next assignee) required' USING ERRCODE = '42501';
    END IF;

    UPDATE core.document_approval_lines
    SET action_status = 'APPROVED',
        comment = NULLIF(btrim(COALESCE(p_comment, '')), ''),
        signature_data = p_signature,
        action_at = now()
    WHERE id = v_step.id;

    INSERT INTO core.document_approval_lines (
      assessment_id, organization_id, step_order, step_type,
      assignee_id, action_status
    ) VALUES (
      p_assessment_id, v_doc.organization_id, 3, 'APPROVE',
      p_next_assignee_id, 'WAIT'
    )
    ON CONFLICT (assessment_id, step_order) DO UPDATE
    SET assignee_id = EXCLUDED.assignee_id,
        action_status = 'WAIT',
        comment = NULL,
        signature_data = NULL,
        action_at = NULL;

    UPDATE core.risk_assessments
    SET status = 'APPROVAL_PENDING', updated_at = now()
    WHERE id = p_assessment_id;

    PERFORM core._fail_closed_risk_audit(
      v_doc.organization_id,
      'ASSESSMENT_REVIEW_APPROVED',
      p_assessment_id,
      jsonb_build_object('step_order', 2, 'next_assignee_id', p_next_assignee_id)
    );

    RETURN jsonb_build_object('success', true, 'status', 'APPROVAL_PENDING');
  END IF;

  -- step_order = 3 최종 승인
  IF v_doc.status <> 'APPROVAL_PENDING' THEN
    RAISE EXCEPTION 'invalid status for final approval' USING ERRCODE = '42501';
  END IF;
  IF NOT core.can_approve_risk_assessment(v_doc.organization_id) THEN
    RAISE EXCEPTION 'approve permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE core.document_approval_lines
  SET action_status = 'APPROVED',
      comment = NULLIF(btrim(COALESCE(p_comment, '')), ''),
      signature_data = p_signature,
      action_at = now()
  WHERE id = v_step.id;

  UPDATE core.risk_assessments
  SET status = 'APPROVED',
      occasional_review_required = false,
      updated_at = now()
  WHERE id = p_assessment_id;

  v_revision_type := CASE
    WHEN v_doc.current_version <= 1 THEN 'INITIAL'
    WHEN v_doc.occasional_review_required THEN 'OCCASIONAL'
    ELSE 'PERIODIC'
  END;

  INSERT INTO core.risk_assessment_revisions (
    assessment_id, organization_id, version, revision_type,
    revision_reason, snapshot_payload, approved_by, approved_at
  ) VALUES (
    p_assessment_id,
    v_doc.organization_id,
    v_doc.current_version,
    v_revision_type,
    COALESCE(
      NULLIF(btrim(COALESCE(p_comment, '')), ''),
      CASE WHEN v_doc.current_version <= 1 THEN '최초 승인' ELSE '정기/개정 승인' END
    ),
    jsonb_build_object(
      'id', v_doc.id,
      'document_no', v_doc.document_no,
      'title', v_doc.title,
      'process_name', v_doc.process_name,
      'department_id', v_doc.department_id,
      'current_version', v_doc.current_version,
      'status', 'APPROVED',
      'payload', v_doc.snapshot_payload
    ),
    v_uid,
    now()
  );

  -- 해당 공정 활성 멤버에게 재서약 대기 레코드 생성
  INSERT INTO core.risk_assessment_worker_repledges (
    organization_id, assessment_id, department_id, required_version, worker_user_id
  )
  SELECT
    v_doc.organization_id,
    p_assessment_id,
    v_doc.department_id,
    v_doc.current_version,
    m.user_id
  FROM core.organization_members m
  WHERE m.organization_id = v_doc.organization_id
    AND m.is_active = true
    AND (
      v_doc.department_id IS NULL
      OR m.department_id IS NULL
      OR m.department_id = v_doc.department_id
    )
  ON CONFLICT (assessment_id, worker_user_id, required_version) DO NOTHING;

  PERFORM core._fail_closed_risk_audit(
    v_doc.organization_id,
    'ASSESSMENT_APPROVED',
    p_assessment_id,
    jsonb_build_object(
      'version', v_doc.current_version,
      'revision_type', v_revision_type,
      'status', 'APPROVED'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'APPROVED',
    'version', v_doc.current_version
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC 3: 반려
-- ---------------------------------------------------------------------------
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_reject_reason IS NULL OR length(btrim(p_reject_reason)) = 0 THEN
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

  IF p_step_order = 2 AND NOT core.can_review_risk_assessment(v_doc.organization_id) THEN
    RAISE EXCEPTION 'review permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_step_order = 3 AND NOT core.can_approve_risk_assessment(v_doc.organization_id) THEN
    RAISE EXCEPTION 'approve permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE core.document_approval_lines
  SET action_status = 'REJECTED',
      comment = btrim(p_reject_reason),
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
  SET status = 'DRAFT', updated_at = now()
  WHERE id = p_assessment_id;

  INSERT INTO core.notifications (
    organization_id, type, title, message, target_type, target_id, metadata
  ) VALUES (
    v_doc.organization_id,
    'risk_assessment_rejected',
    '위험성평가 반려',
    btrim(p_reject_reason),
    'risk_assessment',
    p_assessment_id,
    jsonb_build_object(
      'step_order', p_step_order,
      'reason', btrim(p_reject_reason),
      'author_id', v_doc.created_by
    )
  );

  PERFORM core._fail_closed_risk_audit(
    v_doc.organization_id,
    'ASSESSMENT_REJECTED',
    p_assessment_id,
    jsonb_build_object('step_order', p_step_order, 'reason', btrim(p_reject_reason))
  );

  RETURN jsonb_build_object('success', true, 'status', 'DRAFT');
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC 4: 개정 발의 (APPROVED → 새 버전 DRAFT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.revise_risk_assessment(
  p_assessment_id UUID,
  p_revision_type TEXT,
  p_revision_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_doc core.risk_assessments%ROWTYPE;
  v_uid UUID := auth.uid();
  v_new_version INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_revision_type IS NULL OR p_revision_type NOT IN ('PERIODIC', 'OCCASIONAL') THEN
    RAISE EXCEPTION 'revision_type must be PERIODIC or OCCASIONAL' USING ERRCODE = '42501';
  END IF;
  IF p_revision_reason IS NULL OR length(btrim(p_revision_reason)) = 0 THEN
    RAISE EXCEPTION 'revision reason required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_doc FROM core.risk_assessments WHERE id = p_assessment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment not found' USING ERRCODE = '42501';
  END IF;
  IF v_doc.status NOT IN ('APPROVED', 'LOCKED') THEN
    RAISE EXCEPTION 'only approved documents can be revised' USING ERRCODE = '42501';
  END IF;
  IF v_doc.created_by <> v_uid AND NOT core.is_org_owner_or_admin(v_doc.organization_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_new_version := v_doc.current_version + 1;

  PERFORM set_config('risk_assessment.allow_revise', '1', true);

  UPDATE core.risk_assessments
  SET current_version = v_new_version,
      status = 'DRAFT',
      occasional_review_required = (p_revision_type = 'OCCASIONAL'),
      updated_at = now(),
      snapshot_payload = COALESCE(snapshot_payload, '{}'::jsonb)
        || jsonb_build_object(
          'pending_revision_type', p_revision_type,
          'pending_revision_reason', btrim(p_revision_reason)
        )
  WHERE id = p_assessment_id;

  DELETE FROM core.document_approval_lines WHERE assessment_id = p_assessment_id;

  PERFORM core._fail_closed_risk_audit(
    v_doc.organization_id,
    'ASSESSMENT_REVISION_STARTED',
    p_assessment_id,
    jsonb_build_object(
      'from_version', v_doc.current_version,
      'to_version', v_new_version,
      'revision_type', p_revision_type,
      'revision_reason', btrim(p_revision_reason)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'DRAFT',
    'current_version', v_new_version
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC 5: 작업자 재서약 완료
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.complete_risk_assessment_repledge(
  p_repledge_id UUID,
  p_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_row core.risk_assessment_worker_repledges%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_signature IS NULL OR length(btrim(p_signature)) < 8 THEN
    RAISE EXCEPTION 'signature required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM core.risk_assessment_worker_repledges
  WHERE id = p_repledge_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'repledge not found' USING ERRCODE = '42501';
  END IF;
  IF v_row.worker_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_row.pledged_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_pledged', true);
  END IF;

  UPDATE core.risk_assessment_worker_repledges
  SET pledged_at = now(), signature_data = p_signature
  WHERE id = p_repledge_id;

  PERFORM core._fail_closed_risk_audit(
    v_row.organization_id,
    'ASSESSMENT_WORKER_REPLEDGED',
    v_row.assessment_id,
    jsonb_build_object('repledge_id', p_repledge_id, 'version', v_row.required_version)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 아차사고 → 수시 평가 검토 필요 뱃지
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'core' AND table_name = 'incident_logs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'core' AND table_name = 'incident_logs' AND column_name = 'metadata'
    ) THEN
      ALTER TABLE core.incident_logs
        ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'core' AND table_name = 'incident_logs' AND column_name = 'department_id'
    ) THEN
      ALTER TABLE core.incident_logs
        ADD COLUMN department_id UUID NULL REFERENCES core.departments(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION core.flag_occasional_review_from_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  UPDATE core.risk_assessments ra
  SET occasional_review_required = true,
      updated_at = now()
  WHERE ra.organization_id = NEW.organization_id
    AND ra.status IN ('APPROVED', 'LOCKED')
    AND (
      (NEW.department_id IS NOT NULL AND ra.department_id = NEW.department_id)
      OR (
        COALESCE(NEW.metadata, '{}'::jsonb) ? 'process_name'
        AND ra.process_name = NEW.metadata->>'process_name'
      )
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_flag_occasional_review ON core.incident_logs;
CREATE TRIGGER trg_incident_flag_occasional_review
  AFTER INSERT ON core.incident_logs
  FOR EACH ROW
  EXECUTE FUNCTION core.flag_occasional_review_from_incident();

GRANT EXECUTE ON FUNCTION core.submit_risk_assessment_for_review(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.approve_risk_assessment_step(UUID, INT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.reject_risk_assessment_step(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.revise_risk_assessment(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.complete_risk_assessment_repledge(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.can_review_risk_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.can_approve_risk_assessment(UUID) TO authenticated;

COMMIT;
