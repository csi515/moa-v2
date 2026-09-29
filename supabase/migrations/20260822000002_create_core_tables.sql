-- Phase 0: Core tables

-- =============================================
-- ORGANIZATION & AUTH
-- =============================================

CREATE TABLE core.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  industry_type TEXT NOT NULL DEFAULT 'piano',
  slug          TEXT UNIQUE,
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
  role            core.member_role NOT NULL DEFAULT 'staff',
  staff_id        UUID,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- =============================================
-- CUSTOMER & STAFF
-- =============================================

CREATE TABLE core.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  metadata        JSONB NOT NULL DEFAULT '{}',
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.customer_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  relationship    TEXT,
  phone           TEXT,
  email           TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link organization_members.staff_id after staff table exists
ALTER TABLE core.organization_members
  ADD CONSTRAINT organization_members_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES core.staff(id) ON DELETE SET NULL;

-- =============================================
-- SERVICE & SCHEDULE
-- =============================================

CREATE TABLE core.services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 50,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_schedulable   BOOLEAN NOT NULL DEFAULT true,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.service_staff (
  service_id UUID NOT NULL REFERENCES core.services(id) ON DELETE CASCADE,
  staff_id   UUID NOT NULL REFERENCES core.staff(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, staff_id)
);

CREATE TABLE core.schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES core.services(id) ON DELETE SET NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          core.schedule_status NOT NULL DEFAULT 'scheduled',
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedules_ends_after_starts CHECK (ends_at > starts_at)
);

-- =============================================
-- PAYMENT
-- =============================================

CREATE TABLE core.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  billed_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date        DATE,
  status          core.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method  core.payment_method,
  paid_at         TIMESTAMPTZ,
  receipt_number  TEXT,
  memo            TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_amounts_valid CHECK (paid_amount >= 0 AND billed_amount >= 0 AND paid_amount <= billed_amount)
);

CREATE TABLE core.payment_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  payment_id      UUID NOT NULL REFERENCES core.payments(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method  core.payment_method NOT NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_number  TEXT,
  memo            TEXT,
  created_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CONSULTATION & NOTIFICATION
-- =============================================

CREATE TABLE core.consultations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type              TEXT NOT NULL DEFAULT 'general',
  content           TEXT,
  result            TEXT,
  follow_up         TEXT,
  next_date         DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE core.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  target_type     TEXT,
  target_id       UUID,
  status          core.notification_status NOT NULL DEFAULT 'pending',
  channel         core.notification_channel NOT NULL DEFAULT 'app',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_org_members_user_id ON core.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON core.organization_members(organization_id);
CREATE INDEX idx_customers_org_id ON core.customers(organization_id);
CREATE INDEX idx_customers_org_status ON core.customers(organization_id, status);
CREATE INDEX idx_customer_contacts_customer_id ON core.customer_contacts(customer_id);
CREATE INDEX idx_staff_org_id ON core.staff(organization_id);
CREATE INDEX idx_services_org_id ON core.services(organization_id);
CREATE INDEX idx_schedules_org_id ON core.schedules(organization_id);
CREATE INDEX idx_schedules_starts_at ON core.schedules(organization_id, starts_at);
CREATE INDEX idx_schedules_staff_id ON core.schedules(staff_id, starts_at);
CREATE INDEX idx_payments_org_id ON core.payments(organization_id);
CREATE INDEX idx_payments_customer_id ON core.payments(customer_id);
CREATE INDEX idx_payments_status ON core.payments(organization_id, status);
CREATE INDEX idx_payment_transactions_payment_id ON core.payment_transactions(payment_id);
CREATE INDEX idx_consultations_org_id ON core.consultations(organization_id);
CREATE INDEX idx_consultations_customer_id ON core.consultations(customer_id);
CREATE INDEX idx_notifications_org_id ON core.notifications(organization_id);
CREATE INDEX idx_notifications_status ON core.notifications(organization_id, status);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.organizations
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.profiles
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.organization_members
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.customers
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.staff
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.services
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.schedules
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.payments
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.consultations
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON core.notifications
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
