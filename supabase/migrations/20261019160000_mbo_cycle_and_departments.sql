-- MBO 기간 설정, 부서·부서장, 목표 잠금/평가 창 함수, 부서장 평가 조회

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Departments + staff.department_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  manager_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_org_name
  ON core.departments (organization_id, lower(btrim(name)));

ALTER TABLE core.staff
  ADD COLUMN IF NOT EXISTS department_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_department_id_fkey'
  ) THEN
    ALTER TABLE core.staff
      ADD CONSTRAINT staff_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES core.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_manager_staff_id_fkey'
  ) THEN
    ALTER TABLE core.departments
      ADD CONSTRAINT departments_manager_staff_id_fkey
      FOREIGN KEY (manager_staff_id) REFERENCES core.staff(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_department ON core.staff (department_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON core.departments (organization_id);

ALTER TABLE core.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_member_select ON core.departments;
CREATE POLICY departments_member_select ON core.departments
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS departments_owner_write ON core.departments;
CREATE POLICY departments_owner_write ON core.departments
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- 2. Cycle settings (one row per organization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.mbo_cycle_settings (
  organization_id uuid PRIMARY KEY REFERENCES core.organizations(id) ON DELETE CASCADE,
  goal_lock_enabled boolean NOT NULL DEFAULT true,
  goal_lock_month integer NOT NULL DEFAULT 1 CHECK (goal_lock_month BETWEEN 1 AND 12),
  goal_lock_day integer NOT NULL DEFAULT 31 CHECK (goal_lock_day BETWEEN 1 AND 31),
  review_start_month integer NOT NULL DEFAULT 12 CHECK (review_start_month BETWEEN 1 AND 12),
  review_start_day integer NOT NULL DEFAULT 1 CHECK (review_start_day BETWEEN 1 AND 31),
  review_end_month integer NOT NULL DEFAULT 12 CHECK (review_end_month BETWEEN 1 AND 12),
  review_end_day integer NOT NULL DEFAULT 31 CHECK (review_end_day BETWEEN 1 AND 31),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE core.mbo_cycle_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mbo_cycle_settings_member_select ON core.mbo_cycle_settings;
CREATE POLICY mbo_cycle_settings_member_select ON core.mbo_cycle_settings
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

DROP POLICY IF EXISTS mbo_cycle_settings_owner_write ON core.mbo_cycle_settings;
CREATE POLICY mbo_cycle_settings_owner_write ON core.mbo_cycle_settings
  FOR ALL TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- 3. Calendar + lock / review window helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.mbo_calendar_date(p_year integer, p_month integer, p_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT make_date(
    p_year,
    p_month,
    LEAST(
      p_day,
      EXTRACT(DAY FROM (date_trunc('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'))::integer
    )
  );
$$;

CREATE OR REPLACE FUNCTION core.mbo_goals_locked(p_org uuid, p_on_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  s core.mbo_cycle_settings%ROWTYPE;
  lock_date date;
BEGIN
  SELECT * INTO s FROM core.mbo_cycle_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    s.goal_lock_enabled := true;
    s.goal_lock_month := 1;
    s.goal_lock_day := 31;
  END IF;
  IF NOT s.goal_lock_enabled THEN
    RETURN false;
  END IF;
  lock_date := core.mbo_calendar_date(EXTRACT(YEAR FROM p_on_date)::integer, s.goal_lock_month, s.goal_lock_day);
  RETURN p_on_date > lock_date;
END;
$$;

CREATE OR REPLACE FUNCTION core.mbo_review_open(p_org uuid, p_on_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
DECLARE
  s core.mbo_cycle_settings%ROWTYPE;
  y integer := EXTRACT(YEAR FROM p_on_date)::integer;
  start_d date;
  end_d date;
BEGIN
  SELECT * INTO s FROM core.mbo_cycle_settings WHERE organization_id = p_org;
  IF NOT FOUND THEN
    s.review_start_month := 12;
    s.review_start_day := 1;
    s.review_end_month := 12;
    s.review_end_day := 31;
  END IF;
  start_d := core.mbo_calendar_date(y, s.review_start_month, s.review_start_day);
  end_d := core.mbo_calendar_date(y, s.review_end_month, s.review_end_day);
  RETURN p_on_date >= start_d AND p_on_date <= end_d;
END;
$$;

CREATE OR REPLACE FUNCTION core.is_dept_manager_of_user(p_org uuid, p_target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.staff me
    JOIN core.departments d
      ON d.manager_staff_id = me.id
     AND d.organization_id = p_org
    JOIN core.staff teammate
      ON teammate.department_id = d.id
     AND teammate.organization_id = p_org
    WHERE me.organization_id = p_org
      AND me.user_id = auth.uid()
      AND teammate.user_id = p_target_user
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Enforce lock / review window on writes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.enforce_mbo_goal_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  IF core.mbo_goals_locked(NEW.organization_id, CURRENT_DATE)
     AND (
       NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.success_criteria IS DISTINCT FROM OLD.success_criteria
       OR NEW.weight IS DISTINCT FROM OLD.weight
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.target_date IS DISTINCT FROM OLD.target_date
       OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
     ) THEN
    RAISE EXCEPTION 'goal lock is active; objective text and KPI fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mbo_goal_lock ON core.mbo_objectives;
CREATE TRIGGER trg_enforce_mbo_goal_lock
  BEFORE UPDATE ON core.mbo_objectives
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_mbo_goal_lock();

CREATE OR REPLACE FUNCTION core.enforce_mbo_review_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
AS $$
BEGIN
  IF NOT core.mbo_review_open(NEW.organization_id, CURRENT_DATE) THEN
    RAISE EXCEPTION 'year-end review window is closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mbo_review_insert ON core.mbo_evaluations;
CREATE TRIGGER trg_enforce_mbo_review_insert
  BEFORE INSERT ON core.mbo_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_mbo_review_window();

DROP TRIGGER IF EXISTS trg_enforce_mbo_review_update ON core.mbo_evaluations;
CREATE TRIGGER trg_enforce_mbo_review_update
  BEFORE UPDATE OF score, grade, qualitative_feedback, workflow_status ON core.mbo_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION core.enforce_mbo_review_window();

-- submit RPC also checks the window (preserve history write from prior migration)
CREATE OR REPLACE FUNCTION core.submit_mbo_evaluation(p_eval_id uuid)
RETURNS core.mbo_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public, pg_catalog
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
  IF NOT core.mbo_review_open(row.organization_id, CURRENT_DATE) THEN
    RAISE EXCEPTION 'year-end review window is closed';
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

-- ---------------------------------------------------------------------------
-- 5. Department manager SELECT on confidential evaluations + mbo_goals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS org_mbo_evaluations_dept_manager_select ON core.mbo_evaluations;
CREATE POLICY org_mbo_evaluations_dept_manager_select ON core.mbo_evaluations
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND target_user_id IS NOT NULL
    AND core.is_dept_manager_of_user(organization_id, target_user_id)
  );

DROP POLICY IF EXISTS mbo_goals_dept_manager_select ON core.mbo_goals;
CREATE POLICY mbo_goals_dept_manager_select ON core.mbo_goals
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    AND (
      author_id = auth.uid()
      OR evaluator_id = auth.uid()
      OR core.is_org_owner_or_admin(organization_id)
      OR core.is_dept_manager_of_user(organization_id, author_id)
    )
  );

COMMIT;
