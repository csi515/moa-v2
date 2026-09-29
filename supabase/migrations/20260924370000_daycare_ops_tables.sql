-- Daycare 운영 데이터: device-local → core 원장.
-- 알림장/투약은 기존 테이블 유지. 이번 범위만 추가한다.

CREATE TABLE IF NOT EXISTS core.care_child_records (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id            UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  vaccination_checked_at DATE,
  health_check_date      DATE,
  allergy_note           TEXT,
  authorized_pickups     JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, customer_id)
);

CREATE TABLE IF NOT EXISTS core.care_incidents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id        UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  occurred_at        TIMESTAMPTZ NOT NULL,
  content            TEXT NOT NULL DEFAULT '',
  action_taken       TEXT NOT NULL DEFAULT '',
  parent_notified_at TIMESTAMPTZ,
  staff_id           UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.care_staff_health_certs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES core.staff(id) ON DELETE CASCADE,
  expires_at      DATE NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, staff_id)
);

CREATE TABLE IF NOT EXISTS core.care_safety_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('fire_drill', 'safety_inspection')),
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  note            TEXT,
  staff_id        UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.care_meal_samples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  menu_name       TEXT NOT NULL,
  stored_at       TIMESTAMPTZ NOT NULL,
  dispose_at      TIMESTAMPTZ NOT NULL,
  staff_id        UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.care_cctv_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  requested_at       TIMESTAMPTZ NOT NULL,
  purpose            TEXT NOT NULL DEFAULT '',
  applicant_name     TEXT NOT NULL DEFAULT '',
  applicant_staff_id UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'requested'
                       CHECK (status IN ('requested', 'approved', 'rejected')),
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.care_pickup_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  pickup_date     DATE NOT NULL,
  picked_up_at    TIMESTAMPTZ NOT NULL,
  picker_name     TEXT NOT NULL DEFAULT '',
  relation        TEXT NOT NULL DEFAULT '',
  outside_consent BOOLEAN NOT NULL DEFAULT false,
  staff_id        UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, customer_id, pickup_date)
);

CREATE INDEX IF NOT EXISTS idx_care_child_records_org
  ON core.care_child_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_incidents_org
  ON core.care_incidents(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_staff_health_certs_org
  ON core.care_staff_health_certs(organization_id);
CREATE INDEX IF NOT EXISTS idx_care_safety_logs_org
  ON core.care_safety_logs(organization_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_care_meal_samples_org
  ON core.care_meal_samples(organization_id, stored_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_cctv_requests_org
  ON core.care_cctv_requests(organization_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_care_pickup_logs_org
  ON core.care_pickup_logs(organization_id, pickup_date DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_child_records
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_incidents
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_staff_health_certs
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_safety_logs
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_meal_samples
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_cctv_requests
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.care_pickup_logs
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.care_child_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_staff_health_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_safety_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_meal_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_cctv_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.care_pickup_logs ENABLE ROW LEVEL SECURITY;

-- 원아 연결 기록: 직원 쓰기, 보호자는 자기 자녀만 조회
CREATE POLICY care_child_records_select ON core.care_child_records
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );
CREATE POLICY care_child_records_write ON core.care_child_records
  FOR ALL TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

CREATE POLICY care_incidents_select ON core.care_incidents
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );
CREATE POLICY care_incidents_write ON core.care_incidents
  FOR ALL TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

CREATE POLICY care_pickup_logs_select ON core.care_pickup_logs
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );
CREATE POLICY care_pickup_logs_write ON core.care_pickup_logs
  FOR ALL TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
  );

-- 시설·직원 민감 기록: 보호자 노출 없음
CREATE POLICY care_staff_health_certs_staff ON core.care_staff_health_certs
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id));

CREATE POLICY care_safety_logs_staff ON core.care_safety_logs
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id));

CREATE POLICY care_meal_samples_staff ON core.care_meal_samples
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id));

CREATE POLICY care_cctv_requests_staff ON core.care_cctv_requests
  FOR ALL TO authenticated
  USING (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id))
  WITH CHECK (core.is_org_admin(organization_id) OR core.is_org_staff_actor(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_child_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_staff_health_certs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_safety_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_meal_samples TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_cctv_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.care_pickup_logs TO authenticated;

COMMENT ON TABLE core.care_child_records IS '원아 건강·귀가 기록. SoT=server. 직원 쓰기, 보호자는 자기 자녀만 조회.';
COMMENT ON TABLE core.care_incidents IS '원내 사고 기록. SoT=server. 직원 쓰기, 보호자는 자기 자녀만 조회.';
COMMENT ON TABLE core.care_staff_health_certs IS '교사 보건증. SoT=server. 직원만.';
COMMENT ON TABLE core.care_safety_logs IS '안전점검·대피훈련. SoT=server. 직원만.';
COMMENT ON TABLE core.care_meal_samples IS '보존식. SoT=server. 직원만.';
COMMENT ON TABLE core.care_cctv_requests IS 'CCTV 열람 신청. SoT=server. 직원만.';
COMMENT ON TABLE core.care_pickup_logs IS '하원 인수. SoT=server. 직원 쓰기, 보호자는 자기 자녀만 조회.';
