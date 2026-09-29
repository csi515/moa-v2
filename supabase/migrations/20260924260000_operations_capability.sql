-- 공통 운영 Capability. Checklist / Task / Maintenance.
-- 업종 객체를 만들지 않는다. Bath 시설명을 넣지 않는다.

CREATE TYPE core.ops_task_status AS ENUM (
  'open', 'assigned', 'in_progress', 'completed', 'cancelled'
);
CREATE TYPE core.ops_task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE core.ops_issue_status AS ENUM (
  'reported', 'acknowledged', 'in_progress', 'resolved', 'cancelled'
);

CREATE TABLE core.checklist_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  purpose         TEXT NOT NULL DEFAULT 'other',
  target_type     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checklist_template_name_check CHECK (length(btrim(name)) > 0)
);

CREATE TABLE core.checklist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES core.checklist_templates(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  required        BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT checklist_item_title_check CHECK (length(btrim(title)) > 0),
  CONSTRAINT checklist_item_order_check CHECK (sort_order >= 1),
  CONSTRAINT uq_checklist_item_order UNIQUE (template_id, sort_order)
);

CREATE TABLE core.ops_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  target_type        TEXT NOT NULL,
  target_id          TEXT NOT NULL,
  template_id        UUID REFERENCES core.checklist_templates(id) ON DELETE SET NULL,
  assigned_staff_id  UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  status             core.ops_task_status NOT NULL DEFAULT 'open',
  priority           core.ops_task_priority NOT NULL DEFAULT 'normal',
  due_at             TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  issue_id           UUID,
  notification_id    UUID REFERENCES core.notifications(id) ON DELETE SET NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ops_task_target_check CHECK (
    length(btrim(target_type)) > 0 AND length(btrim(target_id)) > 0
  ),
  CONSTRAINT ops_task_completed_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE TABLE core.ops_task_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES core.ops_tasks(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES core.checklist_items(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  required        BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL,
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  CONSTRAINT ops_task_check_order UNIQUE (task_id, sort_order)
);

CREATE TABLE core.maintenance_issues (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  target_type        TEXT NOT NULL,
  target_id          TEXT NOT NULL,
  reported_by        UUID NOT NULL REFERENCES core.staff(id) ON DELETE RESTRICT,
  assigned_staff_id  UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  task_id            UUID REFERENCES core.ops_tasks(id) ON DELETE SET NULL,
  status             core.ops_issue_status NOT NULL DEFAULT 'reported',
  description        TEXT NOT NULL,
  resolution         TEXT,
  resolved_at        TIMESTAMPTZ,
  notification_id    UUID REFERENCES core.notifications(id) ON DELETE SET NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_target_check CHECK (
    length(btrim(target_type)) > 0 AND length(btrim(target_id)) > 0
  ),
  CONSTRAINT maintenance_description_check CHECK (length(btrim(description)) > 0),
  CONSTRAINT maintenance_resolved_check CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL)
    OR (status <> 'resolved' AND resolved_at IS NULL)
  )
);

ALTER TABLE core.ops_tasks
  ADD CONSTRAINT ops_tasks_issue_fk
  FOREIGN KEY (issue_id) REFERENCES core.maintenance_issues(id) ON DELETE SET NULL;

COMMENT ON TABLE core.checklist_templates IS '공통 점검 템플릿. 업종 객체를 포함하지 않는다.';
COMMENT ON TABLE core.ops_tasks IS '공통 작업/워크오더. target은 Resource 등 식별자.';
COMMENT ON TABLE core.maintenance_issues IS '고장 신고. notification_id는 향후 알림 연결.';
COMMENT ON COLUMN core.ops_tasks.notification_id IS 'Notification Capability 연결. 발송하지 않는다.';
COMMENT ON COLUMN core.ops_tasks.assigned_staff_id IS 'Core Staff.';

CREATE INDEX idx_checklist_templates_org ON core.checklist_templates (organization_id, is_active);
CREATE INDEX idx_checklist_items_org_template ON core.checklist_items (organization_id, template_id, sort_order);
CREATE INDEX idx_ops_tasks_org_target ON core.ops_tasks (organization_id, target_type, target_id, status);
CREATE INDEX idx_ops_tasks_org_staff ON core.ops_tasks (organization_id, assigned_staff_id);
CREATE INDEX idx_ops_task_checks_org_task ON core.ops_task_checks (organization_id, task_id, sort_order);
CREATE INDEX idx_maintenance_issues_org_target
  ON core.maintenance_issues (organization_id, target_type, target_id, status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.ops_tasks
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.maintenance_issues
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.ops_task_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.maintenance_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY checklist_templates_select ON core.checklist_templates
  FOR SELECT TO authenticated USING (core.is_org_staff_actor(organization_id));
CREATE POLICY checklist_items_select ON core.checklist_items
  FOR SELECT TO authenticated USING (core.is_org_staff_actor(organization_id));
CREATE POLICY ops_tasks_select ON core.ops_tasks
  FOR SELECT TO authenticated USING (core.is_org_staff_actor(organization_id));
CREATE POLICY ops_task_checks_select ON core.ops_task_checks
  FOR SELECT TO authenticated USING (core.is_org_staff_actor(organization_id));
CREATE POLICY maintenance_issues_select ON core.maintenance_issues
  FOR SELECT TO authenticated USING (core.is_org_staff_actor(organization_id));

GRANT SELECT ON core.checklist_templates, core.checklist_items, core.ops_tasks,
  core.ops_task_checks, core.maintenance_issues TO authenticated;

CREATE OR REPLACE FUNCTION core.ops_can_transition_task(
  p_from core.ops_task_status,
  p_to core.ops_task_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_from = p_to THEN true
    WHEN p_from = 'open' AND p_to IN ('assigned', 'in_progress', 'completed', 'cancelled') THEN true
    WHEN p_from = 'assigned' AND p_to IN ('in_progress', 'open', 'completed', 'cancelled') THEN true
    WHEN p_from = 'in_progress' AND p_to IN ('completed', 'cancelled') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION core.ops_can_transition_issue(
  p_from core.ops_issue_status,
  p_to core.ops_issue_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_from = p_to THEN true
    WHEN p_from = 'reported' AND p_to IN ('acknowledged', 'in_progress', 'resolved', 'cancelled') THEN true
    WHEN p_from = 'acknowledged' AND p_to IN ('in_progress', 'resolved', 'cancelled') THEN true
    WHEN p_from = 'in_progress' AND p_to IN ('resolved', 'cancelled') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION core.ops_assert_actor(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION core.ops_assert_staff(p_organization_id UUID, p_staff_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_staff_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM core.staff s
    WHERE s.id = p_staff_id AND s.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Staff not found in organization';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION core.ops_template_payload(p_template core.checklist_templates, p_action TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'action', p_action,
    'template', to_jsonb(p_template),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order)
      FROM core.checklist_items i
      WHERE i.template_id = p_template.id AND i.organization_id = p_template.organization_id
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION core.ops_task_payload(p_task core.ops_tasks, p_action TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'action', p_action,
    'task', to_jsonb(p_task),
    'checks', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sort_order)
      FROM core.ops_task_checks c
      WHERE c.task_id = p_task.id AND c.organization_id = p_task.organization_id
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION core.upsert_checklist_template(
  p_organization_id UUID,
  p_name TEXT,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT 'other',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.checklist_templates%ROWTYPE;
  v_action TEXT := 'created';
  v_item JSONB;
  v_order INT := 0;
  v_title TEXT;
  v_purpose TEXT;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  v_purpose := lower(btrim(COALESCE(p_purpose, 'other')));
  IF v_purpose = '' THEN
    v_purpose := 'other';
  END IF;
  IF length(btrim(COALESCE(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid checklist';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('ops_checklist'),
    hashtext(p_organization_id::text || ':' || COALESCE(p_id::text, btrim(p_name)))
  );

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_row FROM core.checklist_templates
    WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Template not found';
    END IF;
    IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
      RAISE EXCEPTION 'Organization mismatch';
    END IF;
    UPDATE core.checklist_templates
    SET name = btrim(p_name),
        purpose = v_purpose,
        target_type = NULLIF(btrim(COALESCE(p_target_type, '')), ''),
        metadata = COALESCE(p_metadata, '{}'::jsonb),
        updated_at = now()
    WHERE id = p_id AND organization_id = p_organization_id
    RETURNING * INTO v_row;
    DELETE FROM core.checklist_items
    WHERE template_id = v_row.id AND organization_id = p_organization_id;
    v_action := 'updated';
  ELSE
    INSERT INTO core.checklist_templates (
      organization_id, name, purpose, target_type, metadata
    ) VALUES (
      p_organization_id, btrim(p_name), v_purpose,
      NULLIF(btrim(COALESCE(p_target_type, '')), ''),
      COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING * INTO v_row;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_title := btrim(COALESCE(v_item->>'title', ''));
    IF v_title = '' THEN
      CONTINUE;
    END IF;
    v_order := v_order + 1;
    INSERT INTO core.checklist_items (
      organization_id, template_id, title, required, sort_order
    ) VALUES (
      p_organization_id, v_row.id, v_title,
      COALESCE((v_item->>'required')::boolean, true),
      v_order
    );
  END LOOP;

  RETURN core.ops_template_payload(v_row, v_action);
END;
$$;

CREATE OR REPLACE FUNCTION core.deactivate_checklist_template(
  p_organization_id UUID,
  p_template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.checklist_templates%ROWTYPE;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  SELECT * INTO v_row FROM core.checklist_templates WHERE id = p_template_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.is_active = false THEN
    RETURN core.ops_template_payload(v_row, 'idempotent');
  END IF;
  UPDATE core.checklist_templates
  SET is_active = false, updated_at = now()
  WHERE id = p_template_id AND organization_id = p_organization_id
  RETURNING * INTO v_row;
  RETURN core.ops_template_payload(v_row, 'deactivated');
END;
$$;

CREATE OR REPLACE FUNCTION core.create_ops_task(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT,
  p_template_id UUID DEFAULT NULL,
  p_assigned_staff_id UUID DEFAULT NULL,
  p_priority core.ops_task_priority DEFAULT 'normal',
  p_due_at TIMESTAMPTZ DEFAULT NULL,
  p_issue_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_type TEXT;
  v_target TEXT;
  v_task core.ops_tasks%ROWTYPE;
  v_status core.ops_task_status := 'open';
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  v_type := lower(btrim(COALESCE(p_target_type, '')));
  v_target := btrim(COALESCE(p_target_id, ''));
  IF v_type = '' OR v_target = '' THEN
    RAISE EXCEPTION 'Invalid ops target';
  END IF;
  PERFORM core.ops_assert_staff(p_organization_id, p_assigned_staff_id);
  IF p_template_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.checklist_templates t
    WHERE t.id = p_template_id AND t.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  IF p_issue_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.maintenance_issues i
    WHERE i.id = p_issue_id AND i.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Issue not found';
  END IF;
  IF p_assigned_staff_id IS NOT NULL THEN
    v_status := 'assigned';
  END IF;

  INSERT INTO core.ops_tasks (
    organization_id, target_type, target_id, template_id,
    assigned_staff_id, status, priority, due_at, issue_id, metadata
  ) VALUES (
    p_organization_id, v_type, v_target, p_template_id,
    p_assigned_staff_id, v_status, COALESCE(p_priority, 'normal'),
    p_due_at, p_issue_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_task;

  IF p_template_id IS NOT NULL THEN
    INSERT INTO core.ops_task_checks (
      organization_id, task_id, item_id, title, required, sort_order
    )
    SELECT p_organization_id, v_task.id, i.id, i.title, i.required, i.sort_order
    FROM core.checklist_items i
    WHERE i.template_id = p_template_id AND i.organization_id = p_organization_id
    ORDER BY i.sort_order;
  END IF;

  RETURN core.ops_task_payload(v_task, 'created');
END;
$$;

CREATE OR REPLACE FUNCTION core.assign_ops_task(
  p_organization_id UUID,
  p_task_id UUID,
  p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_task core.ops_tasks%ROWTYPE;
  v_next core.ops_task_status;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  PERFORM core.ops_assert_staff(p_organization_id, p_staff_id);

  SELECT * INTO v_task FROM core.ops_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_task.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Task is not assignable';
  END IF;
  v_next := CASE WHEN v_task.status = 'open' THEN 'assigned' ELSE v_task.status END;

  UPDATE core.ops_tasks
  SET assigned_staff_id = p_staff_id, status = v_next, updated_at = now()
  WHERE id = p_task_id AND organization_id = p_organization_id
  RETURNING * INTO v_task;
  RETURN core.ops_task_payload(v_task, 'assigned');
END;
$$;

CREATE OR REPLACE FUNCTION core.set_ops_task_status(
  p_organization_id UUID,
  p_task_id UUID,
  p_status core.ops_task_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_task core.ops_tasks%ROWTYPE;
  v_action TEXT;
  v_incomplete INT;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  SELECT * INTO v_task FROM core.ops_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_task.status = p_status THEN
    RETURN core.ops_task_payload(v_task, 'idempotent');
  END IF;
  IF NOT core.ops_can_transition_task(v_task.status, p_status) THEN
    RAISE EXCEPTION 'Invalid task transition';
  END IF;
  IF p_status = 'completed' THEN
    SELECT COUNT(*) INTO v_incomplete
    FROM core.ops_task_checks
    WHERE task_id = v_task.id AND organization_id = p_organization_id
      AND required AND NOT completed;
    IF v_incomplete > 0 THEN
      RAISE EXCEPTION 'Required checklist items incomplete';
    END IF;
  END IF;

  UPDATE core.ops_tasks
  SET status = p_status,
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_task_id AND organization_id = p_organization_id
  RETURNING * INTO v_task;
  v_action := CASE WHEN p_status = 'completed' THEN 'completed'
                   WHEN p_status = 'cancelled' THEN 'cancelled'
                   ELSE 'updated' END;
  RETURN core.ops_task_payload(v_task, v_action);
END;
$$;

CREATE OR REPLACE FUNCTION core.set_ops_task_check(
  p_organization_id UUID,
  p_task_id UUID,
  p_check_id UUID,
  p_completed BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_task core.ops_tasks%ROWTYPE;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  SELECT * INTO v_task FROM core.ops_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_task.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid task transition';
  END IF;
  UPDATE core.ops_task_checks
  SET completed = p_completed,
      completed_at = CASE WHEN p_completed THEN now() ELSE NULL END
  WHERE id = p_check_id AND task_id = p_task_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  SELECT * INTO v_task FROM core.ops_tasks WHERE id = p_task_id;
  RETURN core.ops_task_payload(v_task, 'updated');
END;
$$;

CREATE OR REPLACE FUNCTION core.report_maintenance_issue(
  p_organization_id UUID,
  p_target_type TEXT,
  p_target_id TEXT,
  p_reported_by UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_type TEXT;
  v_target TEXT;
  v_row core.maintenance_issues%ROWTYPE;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  v_type := lower(btrim(COALESCE(p_target_type, '')));
  v_target := btrim(COALESCE(p_target_id, ''));
  IF v_type = '' OR v_target = '' OR length(btrim(COALESCE(p_description, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid ops target';
  END IF;
  PERFORM core.ops_assert_staff(p_organization_id, p_reported_by);

  INSERT INTO core.maintenance_issues (
    organization_id, target_type, target_id, reported_by, description, metadata
  ) VALUES (
    p_organization_id, v_type, v_target, p_reported_by,
    btrim(p_description), COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('action', 'created', 'issue', to_jsonb(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION core.set_maintenance_issue_status(
  p_organization_id UUID,
  p_issue_id UUID,
  p_status core.ops_issue_status,
  p_resolution TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_row core.maintenance_issues%ROWTYPE;
  v_action TEXT;
BEGIN
  PERFORM core.ops_assert_actor(p_organization_id);
  SELECT * INTO v_row FROM core.maintenance_issues WHERE id = p_issue_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issue not found';
  END IF;
  IF v_row.organization_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF v_row.status = p_status THEN
    RETURN jsonb_build_object('action', 'idempotent', 'issue', to_jsonb(v_row));
  END IF;
  IF NOT core.ops_can_transition_issue(v_row.status, p_status) THEN
    RAISE EXCEPTION 'Invalid issue transition';
  END IF;
  IF p_status = 'resolved' AND length(btrim(COALESCE(p_resolution, v_row.resolution, ''))) = 0 THEN
    RAISE EXCEPTION 'Resolution is required';
  END IF;

  UPDATE core.maintenance_issues
  SET status = p_status,
      resolution = CASE
        WHEN p_status = 'resolved' THEN btrim(COALESCE(p_resolution, v_row.resolution))
        ELSE v_row.resolution
      END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_issue_id AND organization_id = p_organization_id
  RETURNING * INTO v_row;
  v_action := CASE WHEN p_status = 'resolved' THEN 'resolved'
                   WHEN p_status = 'cancelled' THEN 'cancelled'
                   ELSE 'updated' END;
  RETURN jsonb_build_object('action', v_action, 'issue', to_jsonb(v_row));
END;
$$;

REVOKE ALL ON FUNCTION core.ops_can_transition_task(core.ops_task_status, core.ops_task_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ops_can_transition_issue(core.ops_issue_status, core.ops_issue_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ops_assert_actor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ops_assert_staff(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ops_template_payload(core.checklist_templates, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.ops_task_payload(core.ops_tasks, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.upsert_checklist_template(UUID, TEXT, JSONB, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.deactivate_checklist_template(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.create_ops_task(UUID, TEXT, TEXT, UUID, UUID, core.ops_task_priority, TIMESTAMPTZ, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.assign_ops_task(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.set_ops_task_status(UUID, UUID, core.ops_task_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.set_ops_task_check(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.report_maintenance_issue(UUID, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.set_maintenance_issue_status(UUID, UUID, core.ops_issue_status, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION core.upsert_checklist_template(UUID, TEXT, JSONB, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.deactivate_checklist_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.create_ops_task(UUID, TEXT, TEXT, UUID, UUID, core.ops_task_priority, TIMESTAMPTZ, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.assign_ops_task(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.set_ops_task_status(UUID, UUID, core.ops_task_status) TO authenticated;
GRANT EXECUTE ON FUNCTION core.set_ops_task_check(UUID, UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION core.report_maintenance_issue(UUID, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION core.set_maintenance_issue_status(UUID, UUID, core.ops_issue_status, TEXT) TO authenticated;

