-- Phase 4: Piano module schema
-- Industry-specific tables extending Core entities

CREATE SCHEMA IF NOT EXISTS piano;

GRANT USAGE ON SCHEMA piano TO authenticated, anon;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE piano.attendance_status AS ENUM (
  'present', 'absent', 'late', 'early_leave', 'make_up'
);

CREATE TYPE piano.inventory_transaction_type AS ENUM (
  'inbound', 'sale', 'return', 'adjust'
);

CREATE TYPE piano.textbook_payment_status AS ENUM (
  'unpaid', 'partial', 'paid'
);

-- =============================================
-- PIANO CUSTOMERS (Student extension)
-- =============================================

CREATE TABLE piano.customers (
  customer_id       UUID PRIMARY KEY REFERENCES core.customers(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  student_number    TEXT NOT NULL DEFAULT '',
  gender            TEXT NOT NULL DEFAULT 'M',
  birth_date        DATE,
  school            TEXT,
  grade             TEXT,
  level             TEXT NOT NULL DEFAULT '',
  tuition_fee       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_day       INT NOT NULL DEFAULT 25 CHECK (payment_day BETWEEN 1 AND 31),
  teacher_id        UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  join_date         DATE,
  leave_date        DATE,
  special_notes     TEXT,
  avatar_color      TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CLASS MEMBERS
-- =============================================

CREATE TABLE piano.class_members (
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  service_id          UUID NOT NULL REFERENCES core.services(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, customer_id)
);

-- =============================================
-- ATTENDANCE
-- =============================================

CREATE TABLE piano.attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  service_id        UUID REFERENCES core.services(id) ON DELETE SET NULL,
  attendance_date   DATE NOT NULL,
  status            piano.attendance_status NOT NULL DEFAULT 'present',
  absent_reason     TEXT,
  make_up_required  BOOLEAN NOT NULL DEFAULT false,
  make_up_date      DATE,
  memo              TEXT,
  created_by        TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- LESSON & PRACTICE RECORDS
-- =============================================

CREATE TABLE piano.lesson_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  service_id        UUID REFERENCES core.services(id) ON DELETE SET NULL,
  lesson_date       DATE NOT NULL,
  song_title        TEXT NOT NULL DEFAULT '',
  progress          TEXT,
  lesson_content    TEXT,
  strengths         TEXT,
  weaknesses        TEXT,
  homework          TEXT,
  next_plan         TEXT,
  teacher_notes     TEXT,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.practice_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  practice_date     DATE NOT NULL,
  minutes           INT NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  song_title        TEXT NOT NULL DEFAULT '',
  textbook          TEXT,
  page              TEXT,
  homework          TEXT,
  teacher_evaluation TEXT,
  difficulty_part   TEXT,
  next_assignment   TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TEXTBOOKS
-- =============================================

CREATE TABLE piano.textbooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  publisher         TEXT NOT NULL DEFAULT '',
  author            TEXT,
  isbn              TEXT,
  level             TEXT NOT NULL DEFAULT '',
  sale_price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock             INT NOT NULL DEFAULT 0,
  min_stock         INT NOT NULL DEFAULT 0,
  is_for_sale       BOOLEAN NOT NULL DEFAULT true,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.textbook_sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES core.customers(id) ON DELETE CASCADE,
  textbook_id       UUID NOT NULL REFERENCES piano.textbooks(id) ON DELETE CASCADE,
  sale_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status            piano.textbook_payment_status NOT NULL DEFAULT 'unpaid',
  payment_method    core.payment_method,
  memo              TEXT,
  staff_id          UUID REFERENCES core.staff(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.textbook_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  textbook_sale_id  UUID NOT NULL REFERENCES piano.textbook_sales(id) ON DELETE CASCADE,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method    core.payment_method NOT NULL DEFAULT 'cash',
  memo              TEXT,
  receipt_number    TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE piano.textbook_inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  textbook_id       UUID NOT NULL REFERENCES piano.textbooks(id) ON DELETE CASCADE,
  transaction_type  piano.inventory_transaction_type NOT NULL,
  quantity          INT NOT NULL,
  previous_stock    INT NOT NULL DEFAULT 0,
  current_stock     INT NOT NULL DEFAULT 0,
  reference_id      UUID,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SONGS
-- =============================================

CREATE TABLE piano.songs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  composer          TEXT NOT NULL DEFAULT '',
  difficulty        TEXT NOT NULL DEFAULT '초급',
  genre             TEXT NOT NULL DEFAULT '클래식',
  related_textbook  TEXT,
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_piano_customers_org ON piano.customers(organization_id);
CREATE INDEX idx_piano_class_members_org ON piano.class_members(organization_id);
CREATE INDEX idx_piano_class_members_customer ON piano.class_members(customer_id);
CREATE INDEX idx_piano_attendance_org_date ON piano.attendance(organization_id, attendance_date);
CREATE INDEX idx_piano_attendance_customer ON piano.attendance(customer_id, attendance_date);
CREATE INDEX idx_piano_lesson_records_org ON piano.lesson_records(organization_id);
CREATE INDEX idx_piano_lesson_records_customer ON piano.lesson_records(customer_id);
CREATE INDEX idx_piano_practice_records_org ON piano.practice_records(organization_id);
CREATE INDEX idx_piano_practice_records_customer ON piano.practice_records(customer_id);
CREATE INDEX idx_piano_textbooks_org ON piano.textbooks(organization_id);
CREATE INDEX idx_piano_textbook_sales_org ON piano.textbook_sales(organization_id);
CREATE INDEX idx_piano_textbook_sales_customer ON piano.textbook_sales(customer_id);
CREATE INDEX idx_piano_textbook_payments_sale ON piano.textbook_payments(textbook_sale_id);
CREATE INDEX idx_piano_inventory_textbook ON piano.textbook_inventory_transactions(textbook_id);
CREATE INDEX idx_piano_songs_org ON piano.songs(organization_id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.customers
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.attendance
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.lesson_records
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.practice_records
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.textbooks
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.textbook_sales
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON piano.songs
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
