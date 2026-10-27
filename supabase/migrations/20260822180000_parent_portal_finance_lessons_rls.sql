-- Parent portal RLS: finance, lessons, attendance, customers (read-only for linked children)

-- Ensure helper exists (idempotent)
CREATE OR REPLACE FUNCTION core.parent_owns_student(org_id UUID, student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.parent_student_links psl
    WHERE psl.organization_id = org_id
      AND psl.parent_customer_id = core.get_my_parent_customer_id(org_id)
      AND psl.student_customer_id = student_id
  );
$$;

-- =============================================
-- CORE: customers + contacts (parent reads own + children)
-- =============================================
DROP POLICY IF EXISTS customers_select ON core.customers;
CREATE POLICY customers_select ON core.customers
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, id))
    OR core.parent_owns_student(organization_id, id)
    OR id = core.get_my_parent_customer_id(organization_id)
  );

DROP POLICY IF EXISTS customer_contacts_select ON core.customer_contacts;
CREATE POLICY customer_contacts_select ON core.customer_contacts
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

-- =============================================
-- CORE: payments + transactions (tuition tab)
-- =============================================
DROP POLICY IF EXISTS payments_select ON core.payments;
CREATE POLICY payments_select ON core.payments
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS payment_transactions_select ON core.payment_transactions;
CREATE POLICY payment_transactions_select ON core.payment_transactions
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR EXISTS (
      SELECT 1 FROM core.payments p
      WHERE p.id = payment_id
        AND p.organization_id = payment_transactions.organization_id
        AND core.parent_owns_student(p.organization_id, p.customer_id)
    )
  );

-- =============================================
-- CORE: schedules (future timetable)
-- =============================================
DROP POLICY IF EXISTS schedules_select ON core.schedules;
CREATE POLICY schedules_select ON core.schedules
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
      OR (customer_id IS NOT NULL AND core.staff_owns_customer(organization_id, customer_id))
    )
    OR (customer_id IS NOT NULL AND core.parent_owns_student(organization_id, customer_id))
  );

-- =============================================
-- PIANO: lesson records, attendance, practice, events
-- =============================================
DROP POLICY IF EXISTS piano_lesson_records_select ON piano.lesson_records;
CREATE POLICY piano_lesson_records_select ON piano.lesson_records
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
      OR core.staff_owns_customer(organization_id, customer_id)
    )
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS piano_attendance_select ON piano.attendance;
CREATE POLICY piano_attendance_select ON piano.attendance
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS piano_practice_records_select ON piano.practice_records;
CREATE POLICY piano_practice_records_select ON piano.practice_records
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id))
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS piano_events_select ON piano.events;
CREATE POLICY piano_events_select ON piano.events
  FOR SELECT TO authenticated
  USING (
    core.is_org_member(organization_id)
    OR core.is_org_parent(organization_id)
  );

-- =============================================
-- PIANO: textbook sales + payments (tuition tab)
-- =============================================
DROP POLICY IF EXISTS piano_textbook_sales_select ON piano.textbook_sales;
CREATE POLICY piano_textbook_sales_select ON piano.textbook_sales
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR core.parent_owns_student(organization_id, customer_id)
  );

DROP POLICY IF EXISTS piano_textbook_payments_select ON piano.textbook_payments;
CREATE POLICY piano_textbook_payments_select ON piano.textbook_payments
  FOR SELECT TO authenticated
  USING (
    core.is_org_admin(organization_id)
    OR EXISTS (
      SELECT 1 FROM piano.textbook_sales ts
      WHERE ts.id = textbook_sale_id
        AND ts.organization_id = piano.textbook_payments.organization_id
        AND core.parent_owns_student(ts.organization_id, ts.customer_id)
    )
  );

-- =============================================
-- PIANO: assignment_items — scope to staff or parent (if table exists)
-- =============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'piano' AND table_name = 'assignment_items'
  ) THEN
    DROP POLICY IF EXISTS assignment_items_select ON piano.assignment_items;
    CREATE POLICY assignment_items_select ON piano.assignment_items
      FOR SELECT TO authenticated
      USING (
        core.is_org_admin(organization_id)
        OR EXISTS (
          SELECT 1 FROM piano.weekly_assignments wa
          WHERE wa.id = assignment_id
            AND (
              core.rls_staff_or_admin(wa.organization_id, core.staff_owns_customer(wa.organization_id, wa.customer_id))
              OR core.parent_owns_student(wa.organization_id, wa.customer_id)
            )
        )
      );
  END IF;
END $$;
