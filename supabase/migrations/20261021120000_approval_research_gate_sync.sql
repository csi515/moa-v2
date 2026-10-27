-- 연구 게이트 결재: process_approval_step_atomic 완료 시 게이트·과제 상태 원자 동기화
BEGIN;

CREATE OR REPLACE FUNCTION core.recompute_research_project_gate_metrics(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_total integer;
  v_done integer;
  v_any_rejected boolean;
  v_progress integer;
  v_status text;
BEGIN
  SELECT count(*)::integer INTO v_total
  FROM core.research_project_gates
  WHERE project_id = p_project_id;

  SELECT count(*)::integer INTO v_done
  FROM core.research_project_gates
  WHERE project_id = p_project_id
    AND status IN ('approved', 'skipped');

  SELECT EXISTS (
    SELECT 1 FROM core.research_project_gates
    WHERE project_id = p_project_id AND status = 'rejected'
  ) INTO v_any_rejected;

  IF v_total > 0 AND v_done = v_total THEN
    v_progress := 100;
    v_status := 'completed';
  ELSE
    v_progress := CASE WHEN v_total = 0 THEN 0 ELSE (v_done * 100 / v_total) END;
    IF v_any_rejected THEN
      v_status := 'gate_review';
    ELSIF EXISTS (
      SELECT 1 FROM core.research_project_gates
      WHERE project_id = p_project_id
        AND status IN ('pending', 'in_approval', 'rejected')
    ) THEN
      v_status := 'gate_review';
    ELSE
      v_status := 'active';
    END IF;
  END IF;

  UPDATE core.research_projects
  SET progress_rate = v_progress,
      status = v_status,
      updated_at = now()
  WHERE id = p_project_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.sync_research_gate_from_approval_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
  v_gate_id uuid;
  v_project_id uuid;
BEGIN
  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_req.entity_type IS DISTINCT FROM 'research_project_gate' THEN
    RETURN;
  END IF;

  IF NOT core.is_org_member(v_req.organization_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_req.entity_id IS NULL OR length(btrim(v_req.entity_id)) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    v_gate_id := v_req.entity_id::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN;
  END;

  IF v_req.status = 'approved' THEN
    UPDATE core.research_project_gates
    SET status = 'approved',
        decided_at = COALESCE(v_req.final_approved_at, now()),
        decision_note = COALESCE(
          (
            SELECT s.comment
            FROM core.approval_steps s
            WHERE s.request_id = p_request_id AND s.status = 'approved'
            ORDER BY s.step_order DESC
            LIMIT 1
          ),
          decision_note
        ),
        updated_at = now()
    WHERE id = v_gate_id
      AND approval_request_id = p_request_id
    RETURNING project_id INTO v_project_id;
  ELSIF v_req.status = 'rejected' THEN
    UPDATE core.research_project_gates
    SET status = 'rejected',
        decided_at = COALESCE(v_req.rejected_at, now()),
        decision_note = COALESCE(v_req.rejection_reason, decision_note),
        updated_at = now()
    WHERE id = v_gate_id
      AND approval_request_id = p_request_id
    RETURNING project_id INTO v_project_id;
  ELSE
    RETURN;
  END IF;

  IF v_project_id IS NOT NULL THEN
    PERFORM core.recompute_research_project_gate_metrics(v_project_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION core.recompute_research_project_gate_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION core.sync_research_gate_from_approval_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION core.process_approval_step_atomic(
  p_request_id uuid,
  p_step_id uuid,
  p_action text,
  p_comment text DEFAULT NULL,
  p_signature_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp, public
AS $$
DECLARE
  v_req core.approval_requests%ROWTYPE;
  v_step core.approval_steps%ROWTYPE;
  v_next_step core.approval_steps%ROWTYPE;
  v_caller_uid uuid;
  v_is_final boolean;
BEGIN
  v_caller_uid := auth.uid();

  SELECT * INTO v_req FROM core.approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'APPROVAL_REQUEST_NOT_FOUND');
  END IF;

  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_REQUEST_STATUS');
  END IF;

  SELECT * INTO v_step FROM core.approval_steps WHERE id = p_step_id AND request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'APPROVAL_STEP_NOT_FOUND');
  END IF;

  IF v_step.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STEP_STATUS');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE core.approval_steps
    SET status = 'approved',
        comment = p_comment,
        signature_url = p_signature_url,
        processed_at = now()
    WHERE id = p_step_id;

    SELECT * INTO v_next_step
    FROM core.approval_steps
    WHERE request_id = p_request_id AND step_order = v_step.step_order + 1;

    v_is_final := NOT FOUND;

    IF FOUND THEN
      UPDATE core.approval_steps SET status = 'pending' WHERE id = v_next_step.id;
      UPDATE core.approval_requests
      SET current_step_order = v_step.step_order + 1,
          updated_at = now()
      WHERE id = p_request_id;
    ELSE
      UPDATE core.approval_requests
      SET status = 'approved',
          final_approved_at = now(),
          updated_at = now()
      WHERE id = p_request_id;
      PERFORM core.sync_research_gate_from_approval_request(p_request_id);
    END IF;

    RETURN jsonb_build_object('success', true, 'action', 'approved', 'is_final', v_is_final);

  ELSIF p_action = 'reject' THEN
    UPDATE core.approval_steps
    SET status = 'rejected',
        comment = p_comment,
        processed_at = now()
    WHERE id = p_step_id;

    UPDATE core.approval_steps
    SET status = 'skipped'
    WHERE request_id = p_request_id AND step_order > v_step.step_order;

    UPDATE core.approval_requests
    SET status = 'rejected',
        rejected_at = now(),
        rejection_reason = p_comment,
        updated_at = now()
    WHERE id = p_request_id;

    PERFORM core.sync_research_gate_from_approval_request(p_request_id);

    RETURN jsonb_build_object('success', true, 'action', 'rejected');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION core.process_approval_step_atomic(uuid, uuid, text, text, text) TO authenticated;

COMMIT;
