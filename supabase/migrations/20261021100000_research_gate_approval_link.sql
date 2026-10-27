-- 연구 게이트 ↔ 전자결재(approval_workflow) 연계
BEGIN;

ALTER TABLE core.research_project_gates
  ADD COLUMN IF NOT EXISTS approval_request_id UUID
    REFERENCES core.approval_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_research_project_gates_approval
  ON core.research_project_gates (approval_request_id)
  WHERE approval_request_id IS NOT NULL;

ALTER TABLE core.research_project_gates
  DROP CONSTRAINT IF EXISTS research_project_gates_status_check;

ALTER TABLE core.research_project_gates
  ADD CONSTRAINT research_project_gates_status_check
  CHECK (status IN ('pending', 'in_approval', 'approved', 'rejected', 'skipped'));

COMMENT ON COLUMN core.research_project_gates.approval_request_id IS
  'approval_workflow 기안 문서 ID (entity_type=research_project_gate)';

COMMIT;
