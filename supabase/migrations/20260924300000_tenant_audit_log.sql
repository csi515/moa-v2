-- 테넌트 업무 Audit Log 기반.
-- application log와 분리. 기존 도메인 테이블/RPC 동작을 바꾸지 않는다.
-- 파일럿: organization_members UPDATE, authorization_grants INSERT/UPDATE.

BEGIN;

CREATE TABLE core.audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES core.locations(id) ON DELETE SET NULL,
  actor_user_id    UUID,
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  before_data      JSONB,
  after_data       JSONB,
  request_id       TEXT,
  idempotency_key  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_check CHECK (length(btrim(action)) > 0),
  CONSTRAINT audit_logs_entity_id_check CHECK (length(btrim(entity_id)) > 0),
  CONSTRAINT audit_logs_entity_type_check CHECK (
    entity_type IN (
      'customer', 'staff', 'booking', 'reservation', 'payment', 'refund',
      'pass', 'membership', 'sale', 'inventory', 'permissions'
    )
  )
);

COMMENT ON TABLE core.audit_logs IS
  '업무 감사 기록. application log가 아니다. 개별 DELETE/UPDATE 없음. 조직 삭제 시에만 함께 제거.';

CREATE INDEX idx_audit_logs_org_created
  ON core.audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_entity
  ON core.audit_logs (organization_id, entity_type, entity_id);
CREATE UNIQUE INDEX uq_audit_logs_org_idempotency
  ON core.audit_logs (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE core.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_staff_select ON core.audit_logs
  FOR SELECT TO authenticated
  USING (core.is_org_staff_actor(organization_id));

GRANT SELECT ON core.audit_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON core.audit_logs FROM authenticated, anon;

CREATE OR REPLACE FUNCTION core.sanitize_audit_payload(
  p_entity_type TEXT,
  p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_allow TEXT[];
  v_key TEXT;
  v_out JSONB := '{}'::jsonb;
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;
  v_allow := CASE p_entity_type
    WHEN 'customer' THEN ARRAY['status']
    WHEN 'staff' THEN ARRAY['status']
    WHEN 'booking' THEN ARRAY['status']
    WHEN 'reservation' THEN ARRAY['status']
    WHEN 'payment' THEN ARRAY['status', 'amount']
    WHEN 'refund' THEN ARRAY['status', 'amount']
    WHEN 'pass' THEN ARRAY['status']
    WHEN 'membership' THEN ARRAY['role', 'is_active', 'staff_id', 'user_id']
    WHEN 'sale' THEN ARRAY['status', 'total']
    WHEN 'inventory' THEN ARRAY['quantity', 'movement_type']
    WHEN 'permissions' THEN ARRAY['permission', 'scope_type', 'scope_id', 'is_active']
    ELSE ARRAY[]::text[]
  END;
  FOREACH v_key IN ARRAY v_allow LOOP
    IF p_data ? v_key THEN
      v_out := v_out || jsonb_build_object(v_key, p_data -> v_key);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION core.append_audit_log_internal(
  p_organization_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_action TEXT,
  p_location_id UUID DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_id UUID;
  v_location UUID;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization mismatch';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id
    FROM core.audit_logs
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_location := NULL;
  IF p_location_id IS NOT NULL THEN
    v_location := core.assert_location_in_organization(p_organization_id, p_location_id, false);
  END IF;

  INSERT INTO core.audit_logs (
    organization_id, location_id, actor_user_id, action, entity_type, entity_id,
    before_data, after_data, request_id, idempotency_key
  ) VALUES (
    p_organization_id,
    v_location,
    p_actor_user_id,
    btrim(p_action),
    p_entity_type,
    btrim(p_entity_id),
    core.sanitize_audit_payload(p_entity_type, p_before_data),
    core.sanitize_audit_payload(p_entity_type, p_after_data),
    NULLIF(btrim(COALESCE(p_request_id, '')), ''),
    NULLIF(btrim(COALESCE(p_idempotency_key, '')), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION core.append_audit_log(
  p_organization_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_action TEXT,
  p_location_id UUID DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT core.is_org_staff_actor(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN core.append_audit_log_internal(
    p_organization_id, p_entity_type, p_entity_id, p_action,
    p_location_id, p_before_data, p_after_data,
    p_request_id, p_idempotency_key, auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION core.audit_organization_members_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role
     AND OLD.is_active IS NOT DISTINCT FROM NEW.is_active
     AND OLD.staff_id IS NOT DISTINCT FROM NEW.staff_id THEN
    RETURN NEW;
  END IF;
  IF OLD.is_active IS DISTINCT FROM NEW.is_active AND NOT NEW.is_active THEN
    v_action := 'deactivate';
  ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active THEN
    v_action := 'activate';
  ELSIF OLD.role IS DISTINCT FROM NEW.role THEN
    v_action := 'role_changed';
  ELSE
    v_action := 'updated';
  END IF;
  PERFORM core.append_audit_log_internal(
    NEW.organization_id, 'membership', NEW.id::text, v_action, NULL,
    jsonb_build_object(
      'role', OLD.role, 'is_active', OLD.is_active,
      'staff_id', OLD.staff_id, 'user_id', OLD.user_id
    ),
    jsonb_build_object(
      'role', NEW.role, 'is_active', NEW.is_active,
      'staff_id', NEW.staff_id, 'user_id', NEW.user_id
    ),
    NULL, NULL, auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_organization_members_update
  AFTER UPDATE ON core.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_organization_members_change();

CREATE OR REPLACE FUNCTION core.audit_authorization_grants_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_action TEXT;
  v_row core.authorization_grants%ROWTYPE;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_action := 'revoked';
    v_before := jsonb_build_object(
      'permission', OLD.permission, 'scope_type', OLD.scope_type,
      'scope_id', OLD.scope_id, 'is_active', OLD.is_active
    );
    v_after := NULL;
  ELSE
    v_row := NEW;
    v_after := jsonb_build_object(
      'permission', NEW.permission, 'scope_type', NEW.scope_type,
      'scope_id', NEW.scope_id, 'is_active', NEW.is_active
    );
    IF TG_OP = 'INSERT' THEN
      v_action := CASE WHEN NEW.is_active THEN 'granted' ELSE 'created' END;
      v_before := NULL;
    ELSE
      v_before := jsonb_build_object(
        'permission', OLD.permission, 'scope_type', OLD.scope_type,
        'scope_id', OLD.scope_id, 'is_active', OLD.is_active
      );
      IF OLD.is_active IS DISTINCT FROM NEW.is_active AND NOT NEW.is_active THEN
        v_action := 'revoked';
      ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active THEN
        v_action := 'granted';
      ELSE
        v_action := 'updated';
      END IF;
    END IF;
  END IF;

  PERFORM core.append_audit_log_internal(
    v_row.organization_id, 'permissions', v_row.id::text, v_action, NULL,
    v_before, v_after, NULL, NULL, auth.uid()
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_authorization_grants_write
  AFTER INSERT OR UPDATE OR DELETE ON core.authorization_grants
  FOR EACH ROW
  EXECUTE FUNCTION core.audit_authorization_grants_change();

COMMENT ON FUNCTION core.append_audit_log(UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT) IS
  '업무 감사 기록. 동일 트랜잭션에서 호출. is_org_staff_actor만 기록.';
COMMENT ON FUNCTION core.append_audit_log_internal(UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT, UUID) IS
  '트리거/RPC 내부용. 클라이언트 직접 호출 금지.';
COMMENT ON FUNCTION core.sanitize_audit_payload(TEXT, JSONB) IS
  'entity allowlist만 남긴다. 미등록 타입은 빈 객체.';

GRANT EXECUTE ON FUNCTION core.append_audit_log(UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION core.sanitize_audit_payload(TEXT, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION core.append_audit_log(UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION core.append_audit_log_internal(UUID, TEXT, TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

COMMIT;
