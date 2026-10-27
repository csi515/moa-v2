-- MBO 평가 경계, 샘플 분리, 원자 저장, 불변 감사 이력
-- 테넌트 키는 기존 스키마와 동일하게 organization_id 를 사용한다.

ALTER TABLE core.mbo_objectives
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

ALTER TABLE core.mbo_evaluations
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

ALTER TABLE core.mbo_evaluations
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (workflow_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED'));

CREATE TABLE IF NOT EXISTS core.mbo_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  evaluator_id uuid,
  title text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED')),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.mbo_evaluation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  evaluation_id uuid NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('CREATED', 'SUBMITTED', 'EVALUATED', 'APPROVED')),
  actor_id uuid NOT NULL,
  score_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE core.mbo_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_evaluation_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION core.mbo_block_locked_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'mbo_goals' AND OLD.status IN ('APPROVED', 'LOCKED') THEN
      RAISE EXCEPTION 'approved or locked MBO records cannot be deleted';
    END IF;
    IF TG_TABLE_NAME = 'mbo_evaluations' AND OLD.workflow_status IN ('APPROVED', 'LOCKED') THEN
      RAISE EXCEPTION 'approved or locked MBO records cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF (TG_TABLE_NAME = 'mbo_goals' AND OLD.status IN ('APPROVED', 'LOCKED'))
     OR (TG_TABLE_NAME = 'mbo_evaluations' AND OLD.workflow_status IN ('APPROVED', 'LOCKED')) THEN
    IF core.is_org_owner_or_admin(OLD.organization_id) IS NOT TRUE THEN
      RAISE EXCEPTION 'approved or locked MBO records cannot be updated by staff';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mbo_goals_lock ON core.mbo_goals;
CREATE TRIGGER mbo_goals_lock
  BEFORE UPDATE OR DELETE ON core.mbo_goals
  FOR EACH ROW EXECUTE FUNCTION core.mbo_block_locked_mutation();

DROP TRIGGER IF EXISTS mbo_evaluations_lock ON core.mbo_evaluations;
CREATE TRIGGER mbo_evaluations_lock
  BEFORE UPDATE OR DELETE ON core.mbo_evaluations
  FOR EACH ROW EXECUTE FUNCTION core.mbo_block_locked_mutation();

CREATE OR REPLACE FUNCTION core.mbo_history_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'mbo_evaluation_history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS mbo_history_no_update ON core.mbo_evaluation_history;
CREATE TRIGGER mbo_history_no_update
  BEFORE UPDATE OR DELETE ON core.mbo_evaluation_history
  FOR EACH ROW EXECUTE FUNCTION core.mbo_history_immutable();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_goals_author_select') THEN
    CREATE POLICY mbo_goals_author_select ON core.mbo_goals
      FOR SELECT USING (
        core.is_org_member(organization_id) AND (
          author_id = auth.uid()
          OR evaluator_id = auth.uid()
          OR core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_goals_author_insert') THEN
    CREATE POLICY mbo_goals_author_insert ON core.mbo_goals
      FOR INSERT WITH CHECK (
        core.is_org_member(organization_id)
        AND author_id = auth.uid()
        AND status = 'DRAFT'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_goals_author_update') THEN
    CREATE POLICY mbo_goals_author_update ON core.mbo_goals
      FOR UPDATE USING (
        core.is_org_member(organization_id) AND author_id = auth.uid() AND status = 'DRAFT'
      ) WITH CHECK (
        author_id = auth.uid() AND status = 'DRAFT'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_goals_evaluator_update') THEN
    CREATE POLICY mbo_goals_evaluator_update ON core.mbo_goals
      FOR UPDATE USING (
        core.is_org_member(organization_id) AND (
          evaluator_id = auth.uid() OR core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_history_select') THEN
    CREATE POLICY mbo_history_select ON core.mbo_evaluation_history
      FOR SELECT USING (
        core.is_org_member(organization_id) AND (
          actor_id = auth.uid() OR core.is_org_owner_or_admin(organization_id)
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mbo_history_insert') THEN
    CREATE POLICY mbo_history_insert ON core.mbo_evaluation_history
      FOR INSERT WITH CHECK (core.is_org_member(organization_id) AND actor_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION core.submit_mbo_evaluation(p_eval_id uuid)
RETURNS core.mbo_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  row core.mbo_evaluations;
BEGIN
  SELECT * INTO row FROM core.mbo_evaluations WHERE id = p_eval_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evaluation not found';
  END IF;
  IF NOT core.is_org_member(row.organization_id) THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  IF row.target_user_id IS DISTINCT FROM auth.uid() AND row.evaluator_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'only the author or evaluator can submit';
  END IF;
  IF row.workflow_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only DRAFT evaluations can be submitted';
  END IF;
  UPDATE core.mbo_evaluations
    SET workflow_status = 'SUBMITTED', updated_at = now()
    WHERE id = p_eval_id
    RETURNING * INTO row;
  INSERT INTO core.mbo_evaluation_history (organization_id, evaluation_id, action_type, actor_id, score_payload)
  VALUES (row.organization_id, row.id, 'SUBMITTED', auth.uid(), jsonb_build_object('score', row.score));
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION core.approve_mbo_evaluation(
  p_eval_id uuid,
  p_score_payload jsonb,
  p_comment text
)
RETURNS core.mbo_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  row core.mbo_evaluations;
BEGIN
  SELECT * INTO row FROM core.mbo_evaluations WHERE id = p_eval_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'evaluation not found';
  END IF;
  IF row.evaluator_id IS DISTINCT FROM auth.uid() AND core.is_org_owner_or_admin(row.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'evaluator or owner approval required';
  END IF;
  IF row.workflow_status NOT IN ('SUBMITTED', 'DRAFT') THEN
    RAISE EXCEPTION 'evaluation is already finalized';
  END IF;
  UPDATE core.mbo_evaluations
    SET workflow_status = 'APPROVED',
        score = COALESCE((p_score_payload->>'score')::numeric, score),
        qualitative_feedback = COALESCE(p_comment, qualitative_feedback),
        updated_at = now()
    WHERE id = p_eval_id
    RETURNING * INTO row;
  INSERT INTO core.mbo_evaluation_history (
    organization_id, evaluation_id, action_type, actor_id, score_payload, comment
  ) VALUES (
    row.organization_id, row.id, 'APPROVED', auth.uid(), COALESCE(p_score_payload, '{}'::jsonb), p_comment
  );
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION core.save_mbo_goal_bundle(
  p_organization_id uuid,
  p_title text,
  p_key_results jsonb,
  p_comment text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  goal_id uuid;
BEGIN
  IF NOT core.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'tenant access denied';
  END IF;
  INSERT INTO core.mbo_goals (organization_id, author_id, title, key_results, status)
  VALUES (p_organization_id, auth.uid(), p_title, COALESCE(p_key_results, '[]'::jsonb), 'DRAFT')
  RETURNING id INTO goal_id;

  INSERT INTO core.mbo_feedback_comments (
    organization_id, project_id, author_id, author_name, content
  )
  SELECT p_organization_id, p.id, auth.uid(), '사업주', COALESCE(p_comment, '')
  FROM core.mbo_projects p
  WHERE false;

  INSERT INTO core.mbo_evaluation_history (
    organization_id, evaluation_id, action_type, actor_id, score_payload, comment
  ) VALUES (
    p_organization_id, goal_id, 'CREATED', auth.uid(), COALESCE(p_key_results, '[]'::jsonb), p_comment
  );
  RETURN goal_id;
END;
$$;
