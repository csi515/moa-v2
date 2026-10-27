-- MBO 목표 수정 이력(WORM) + 3단계 공개 범위 + 부분 공개 shares + revise_mbo_goal 원자 RPC

BEGIN;

ALTER TABLE core.mbo_goals
  ADD COLUMN IF NOT EXISTS target_value NUMERIC,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS is_revised BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unmet_reason TEXT,
  ADD COLUMN IF NOT EXISTS revision_reason TEXT,
  ADD COLUMN IF NOT EXISTS visibility_type VARCHAR(16) NOT NULL DEFAULT 'PRIVATE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mbo_goals_visibility_type_check'
  ) THEN
    ALTER TABLE core.mbo_goals
      ADD CONSTRAINT mbo_goals_visibility_type_check
      CHECK (visibility_type IN ('PUBLIC', 'PRIVATE', 'PARTIAL'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS core.mbo_goal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES core.mbo_goals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  revised_by UUID NOT NULL,
  previous_target_value NUMERIC,
  previous_due_date DATE,
  previous_title TEXT,
  unmet_reason TEXT,
  revision_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mbo_goal_revisions_goal
  ON core.mbo_goal_revisions (goal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core.mbo_goal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES core.mbo_goals(id) ON DELETE CASCADE,
  shared_with_member_id UUID NOT NULL REFERENCES core.organization_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mbo_goal_shares_unique UNIQUE (goal_id, shared_with_member_id)
);

CREATE INDEX IF NOT EXISTS idx_mbo_goal_shares_member
  ON core.mbo_goal_shares (shared_with_member_id);

ALTER TABLE core.mbo_goal_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mbo_goal_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION core.mbo_goal_revisions_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'mbo_goal_revisions are immutable' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_mbo_goal_revisions_immutable ON core.mbo_goal_revisions;
CREATE TRIGGER trg_mbo_goal_revisions_immutable
  BEFORE UPDATE OR DELETE ON core.mbo_goal_revisions
  FOR EACH ROW
  EXECUTE FUNCTION core.mbo_goal_revisions_immutable();

-- revise RPC가 APPROVED 목표도 수정할 수 있도록 락 트리거 우회 플래그
CREATE OR REPLACE FUNCTION core.mbo_block_locked_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('mbo.allow_revise', true) = '1' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
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

CREATE OR REPLACE FUNCTION core.can_view_mbo_goal(p_goal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.mbo_goals g
    WHERE g.id = p_goal_id
      AND core.is_org_member(g.organization_id)
      AND (
        g.author_id = auth.uid()
        OR g.evaluator_id = auth.uid()
        OR core.is_org_owner_or_admin(g.organization_id)
        OR g.visibility_type = 'PUBLIC'
        OR (
          g.visibility_type = 'PARTIAL'
          AND EXISTS (
            SELECT 1
            FROM core.mbo_goal_shares s
            JOIN core.organization_members m ON m.id = s.shared_with_member_id
            WHERE s.goal_id = g.id
              AND m.user_id = auth.uid()
              AND m.organization_id = g.organization_id
              AND m.is_active = true
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS mbo_goals_author_select ON core.mbo_goals;
CREATE POLICY mbo_goals_author_select ON core.mbo_goals
  FOR SELECT TO authenticated
  USING (core.can_view_mbo_goal(id));

DROP POLICY IF EXISTS mbo_goal_revisions_select ON core.mbo_goal_revisions;
CREATE POLICY mbo_goal_revisions_select ON core.mbo_goal_revisions
  FOR SELECT TO authenticated
  USING (core.can_view_mbo_goal(goal_id));

DROP POLICY IF EXISTS mbo_goal_shares_select ON core.mbo_goal_shares;
CREATE POLICY mbo_goal_shares_select ON core.mbo_goal_shares
  FOR SELECT TO authenticated
  USING (core.can_view_mbo_goal(goal_id) OR core.is_org_owner_or_admin(organization_id));

DROP POLICY IF EXISTS mbo_goal_shares_author_write ON core.mbo_goal_shares;
CREATE POLICY mbo_goal_shares_author_write ON core.mbo_goal_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.mbo_goals g
      WHERE g.id = mbo_goal_shares.goal_id
        AND (g.author_id = auth.uid() OR core.is_org_owner_or_admin(g.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.mbo_goals g
      WHERE g.id = mbo_goal_shares.goal_id
        AND (g.author_id = auth.uid() OR core.is_org_owner_or_admin(g.organization_id))
    )
  );

ALTER TABLE core.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE core.audit_logs ADD CONSTRAINT audit_logs_entity_type_check CHECK (
  entity_type = ANY (ARRAY[
    'customer', 'staff', 'booking', 'reservation', 'payment', 'refund',
    'pass', 'membership', 'sale', 'inventory', 'permissions', 'guardian_link', 'mbo_goal'
  ]::TEXT[])
);

CREATE OR REPLACE FUNCTION core.revise_mbo_goal(
  p_goal_id UUID,
  p_new_target_value NUMERIC,
  p_new_due_date DATE,
  p_unmet_reason TEXT,
  p_revision_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_goal core.mbo_goals%ROWTYPE;
BEGIN
  IF p_revision_reason IS NULL OR length(btrim(p_revision_reason)) = 0 THEN
    RAISE EXCEPTION 'revision reason required' USING ERRCODE = '42501';
  END IF;
  IF p_unmet_reason IS NULL OR length(btrim(p_unmet_reason)) = 0 THEN
    RAISE EXCEPTION 'unmet reason required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_goal FROM core.mbo_goals WHERE id = p_goal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal missing' USING ERRCODE = '42501';
  END IF;
  IF v_goal.status = 'LOCKED' THEN
    RAISE EXCEPTION 'locked goal' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    v_goal.author_id = auth.uid()
    OR core.is_org_owner_or_admin(v_goal.organization_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO core.mbo_goal_revisions (
    goal_id, organization_id, revised_by,
    previous_target_value, previous_due_date, previous_title,
    unmet_reason, revision_reason
  ) VALUES (
    v_goal.id, v_goal.organization_id, auth.uid(),
    v_goal.target_value, v_goal.due_date, v_goal.title,
    btrim(p_unmet_reason), btrim(p_revision_reason)
  );

  PERFORM set_config('mbo.allow_revise', '1', true);

  UPDATE core.mbo_goals
  SET target_value = p_new_target_value,
      due_date = p_new_due_date,
      unmet_reason = btrim(p_unmet_reason),
      revision_reason = btrim(p_revision_reason),
      is_revised = true,
      revision_count = revision_count + 1,
      updated_at = now()
  WHERE id = p_goal_id;

  INSERT INTO core.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, after_data
  ) VALUES (
    v_goal.organization_id,
    auth.uid(),
    'MBO_GOAL_REVISED',
    'mbo_goal',
    p_goal_id::text,
    jsonb_build_object(
      'previous_target_value', v_goal.target_value,
      'previous_due_date', v_goal.due_date,
      'new_target_value', p_new_target_value,
      'new_due_date', p_new_due_date,
      'revision_count', v_goal.revision_count + 1
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.replace_mbo_goal_shares(
  p_goal_id UUID,
  p_member_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  v_org UUID;
  v_author UUID;
BEGIN
  SELECT organization_id, author_id INTO v_org, v_author
  FROM core.mbo_goals WHERE id = p_goal_id FOR UPDATE;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'goal missing' USING ERRCODE = '42501';
  END IF;
  IF NOT (v_author = auth.uid() OR core.is_org_owner_or_admin(v_org)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM core.mbo_goal_shares WHERE goal_id = p_goal_id;
  IF p_member_ids IS NOT NULL AND cardinality(p_member_ids) > 0 THEN
    INSERT INTO core.mbo_goal_shares (organization_id, goal_id, shared_with_member_id)
    SELECT v_org, p_goal_id, mid
    FROM unnest(p_member_ids) AS mid
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE core.mbo_goals
  SET visibility_type = CASE
        WHEN p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN visibility_type
        ELSE 'PARTIAL'
      END,
      updated_at = now()
  WHERE id = p_goal_id AND visibility_type = 'PARTIAL';
END;
$$;

GRANT SELECT ON core.mbo_goal_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.mbo_goal_shares TO authenticated;
GRANT EXECUTE ON FUNCTION core.revise_mbo_goal(UUID, NUMERIC, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.replace_mbo_goal_shares(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION core.can_view_mbo_goal(UUID) TO authenticated;

COMMIT;
