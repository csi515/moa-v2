-- Phase 5c: Staff-scoped RLS — piano schema policies
-- PIANO: CUSTOMERS
-- =============================================

DROP POLICY IF EXISTS piano_customers_select ON piano.customers;
DROP POLICY IF EXISTS piano_customers_insert ON piano.customers;
DROP POLICY IF EXISTS piano_customers_update ON piano.customers;
DROP POLICY IF EXISTS piano_customers_delete ON piano.customers;

CREATE POLICY piano_customers_select ON piano.customers
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      teacher_id = core.get_my_staff_id(organization_id)
    )
  );

CREATE POLICY piano_customers_insert ON piano.customers
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_customers_update ON piano.customers
  FOR UPDATE TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      teacher_id = core.get_my_staff_id(organization_id)
    )
  )
  WITH CHECK (
    core.rls_staff_or_admin(
      organization_id,
      teacher_id = core.get_my_staff_id(organization_id)
    )
  );

CREATE POLICY piano_customers_delete ON piano.customers
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: CLASS MEMBERS
-- =============================================

DROP POLICY IF EXISTS piano_class_members_select ON piano.class_members;
DROP POLICY IF EXISTS piano_class_members_insert ON piano.class_members;
DROP POLICY IF EXISTS piano_class_members_delete ON piano.class_members;

CREATE POLICY piano_class_members_select ON piano.class_members
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      core.staff_owns_service(organization_id, service_id)
      OR core.staff_owns_customer(organization_id, customer_id)
    )
  );

CREATE POLICY piano_class_members_insert ON piano.class_members
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_class_members_delete ON piano.class_members
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: ATTENDANCE
-- =============================================

DROP POLICY IF EXISTS piano_attendance_select ON piano.attendance;
DROP POLICY IF EXISTS piano_attendance_insert ON piano.attendance;
DROP POLICY IF EXISTS piano_attendance_update ON piano.attendance;
DROP POLICY IF EXISTS piano_attendance_delete ON piano.attendance;

CREATE POLICY piano_attendance_select ON piano.attendance
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_attendance_insert ON piano.attendance
  FOR INSERT TO authenticated
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_attendance_update ON piano.attendance
  FOR UPDATE TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_attendance_delete ON piano.attendance
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: LESSON RECORDS
-- =============================================

DROP POLICY IF EXISTS piano_lesson_records_select ON piano.lesson_records;
DROP POLICY IF EXISTS piano_lesson_records_insert ON piano.lesson_records;
DROP POLICY IF EXISTS piano_lesson_records_update ON piano.lesson_records;
DROP POLICY IF EXISTS piano_lesson_records_delete ON piano.lesson_records;

CREATE POLICY piano_lesson_records_select ON piano.lesson_records
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
      OR core.staff_owns_customer(organization_id, customer_id)
    )
  );

CREATE POLICY piano_lesson_records_insert ON piano.lesson_records
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR (
      core.is_org_staff(organization_id)
      AND staff_id = core.get_my_staff_id(organization_id)
      AND core.staff_owns_customer(organization_id, customer_id)
    )
  );

CREATE POLICY piano_lesson_records_update ON piano.lesson_records
  FOR UPDATE TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
    )
  )
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR (
      core.is_org_staff(organization_id)
      AND staff_id = core.get_my_staff_id(organization_id)
    )
  );

CREATE POLICY piano_lesson_records_delete ON piano.lesson_records
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: PRACTICE RECORDS
-- =============================================

DROP POLICY IF EXISTS piano_practice_records_select ON piano.practice_records;
DROP POLICY IF EXISTS piano_practice_records_insert ON piano.practice_records;
DROP POLICY IF EXISTS piano_practice_records_update ON piano.practice_records;
DROP POLICY IF EXISTS piano_practice_records_delete ON piano.practice_records;

CREATE POLICY piano_practice_records_select ON piano.practice_records
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_practice_records_insert ON piano.practice_records
  FOR INSERT TO authenticated
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_practice_records_update ON piano.practice_records
  FOR UPDATE TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_practice_records_delete ON piano.practice_records
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: TEXTBOOKS / SALES / PAYMENTS / INVENTORY (admin only)
-- =============================================

DROP POLICY IF EXISTS piano_textbooks_select ON piano.textbooks;
DROP POLICY IF EXISTS piano_textbooks_insert ON piano.textbooks;
DROP POLICY IF EXISTS piano_textbooks_update ON piano.textbooks;
DROP POLICY IF EXISTS piano_textbooks_delete ON piano.textbooks;

CREATE POLICY piano_textbooks_select ON piano.textbooks
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY piano_textbooks_insert ON piano.textbooks
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_textbooks_update ON piano.textbooks
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_textbooks_delete ON piano.textbooks
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS piano_textbook_sales_select ON piano.textbook_sales;
DROP POLICY IF EXISTS piano_textbook_sales_insert ON piano.textbook_sales;
DROP POLICY IF EXISTS piano_textbook_sales_update ON piano.textbook_sales;
DROP POLICY IF EXISTS piano_textbook_sales_delete ON piano.textbook_sales;

CREATE POLICY piano_textbook_sales_select ON piano.textbook_sales
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY piano_textbook_sales_insert ON piano.textbook_sales
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_textbook_sales_update ON piano.textbook_sales
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_textbook_sales_delete ON piano.textbook_sales
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS piano_textbook_payments_select ON piano.textbook_payments;
DROP POLICY IF EXISTS piano_textbook_payments_insert ON piano.textbook_payments;
DROP POLICY IF EXISTS piano_textbook_payments_delete ON piano.textbook_payments;

CREATE POLICY piano_textbook_payments_select ON piano.textbook_payments
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY piano_textbook_payments_insert ON piano.textbook_payments
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_textbook_payments_delete ON piano.textbook_payments
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS piano_inventory_select ON piano.textbook_inventory_transactions;
DROP POLICY IF EXISTS piano_inventory_insert ON piano.textbook_inventory_transactions;
DROP POLICY IF EXISTS piano_inventory_delete ON piano.textbook_inventory_transactions;

CREATE POLICY piano_inventory_select ON piano.textbook_inventory_transactions
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY piano_inventory_insert ON piano.textbook_inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_inventory_delete ON piano.textbook_inventory_transactions
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: SONGS (org read, staff write for resources)
-- =============================================

DROP POLICY IF EXISTS piano_songs_select ON piano.songs;
DROP POLICY IF EXISTS piano_songs_insert ON piano.songs;
DROP POLICY IF EXISTS piano_songs_update ON piano.songs;
DROP POLICY IF EXISTS piano_songs_delete ON piano.songs;

CREATE POLICY piano_songs_select ON piano.songs
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY piano_songs_insert ON piano.songs
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY piano_songs_update ON piano.songs
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY piano_songs_delete ON piano.songs
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: EVENTS (recitals)
-- =============================================

DROP POLICY IF EXISTS piano_events_select ON piano.events;
DROP POLICY IF EXISTS piano_events_insert ON piano.events;
DROP POLICY IF EXISTS piano_events_update ON piano.events;
DROP POLICY IF EXISTS piano_events_delete ON piano.events;

CREATE POLICY piano_events_select ON piano.events
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      core.staff_can_access_event(organization_id, metadata)
    )
  );

CREATE POLICY piano_events_insert ON piano.events
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_events_update ON piano.events
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_events_delete ON piano.events
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: PERFORMANCE VIDEOS
-- =============================================

DROP POLICY IF EXISTS piano_performance_videos_select ON piano.performance_videos;
DROP POLICY IF EXISTS piano_performance_videos_insert ON piano.performance_videos;
DROP POLICY IF EXISTS piano_performance_videos_update ON piano.performance_videos;
DROP POLICY IF EXISTS piano_performance_videos_delete ON piano.performance_videos;

CREATE POLICY piano_performance_videos_select ON piano.performance_videos
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_performance_videos_insert ON piano.performance_videos
  FOR INSERT TO authenticated
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_performance_videos_update ON piano.performance_videos
  FOR UPDATE TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY piano_performance_videos_delete ON piano.performance_videos
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PIANO: EXPENSES (admin only)
-- =============================================

DROP POLICY IF EXISTS piano_expenses_select ON piano.expenses;
DROP POLICY IF EXISTS piano_expenses_insert ON piano.expenses;
DROP POLICY IF EXISTS piano_expenses_update ON piano.expenses;
DROP POLICY IF EXISTS piano_expenses_delete ON piano.expenses;

CREATE POLICY piano_expenses_select ON piano.expenses
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY piano_expenses_insert ON piano.expenses
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_expenses_update ON piano.expenses
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY piano_expenses_delete ON piano.expenses
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: STAFF (staff can read org roster, edit admin only)
-- =============================================

DROP POLICY IF EXISTS staff_select ON core.staff;
DROP POLICY IF EXISTS staff_insert ON core.staff;
DROP POLICY IF EXISTS staff_update ON core.staff;
DROP POLICY IF EXISTS staff_delete ON core.staff;

CREATE POLICY staff_select ON core.staff
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY staff_insert ON core.staff
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY staff_update ON core.staff
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY staff_delete ON core.staff
  FOR DELETE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- =============================================
-- CORE: ORGANIZATIONS (staff read-only)
-- =============================================

DROP POLICY IF EXISTS organizations_update ON core.organizations;

CREATE POLICY organizations_update ON core.organizations
  FOR UPDATE TO authenticated
  USING (core.is_org_owner_or_admin(id))
  WITH CHECK (core.is_org_owner_or_admin(id));
