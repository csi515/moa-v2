-- Phase 5: Staff-scoped Row Level Security

-- =============================================
-- RLS HELPER FUNCTIONS (staff scope)
-- =============================================

CREATE OR REPLACE FUNCTION core.get_my_staff_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT staff_id
  FROM core.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.is_org_staff(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) = 'staff';
$$;

/** admin(owner/admin/manager) 전체 접근 OR staff + 조건 충족 */
CREATE OR REPLACE FUNCTION core.rls_staff_or_admin(org_id UUID, staff_allowed BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT
    core.is_org_admin(org_id)
    OR (core.is_org_staff(org_id) AND staff_allowed);
$$;

/** 강사 담당 고객(원생/회원) 여부 — piano.teacher_id, metadata.teacherId, pilates 예약 이력 */
CREATE OR REPLACE FUNCTION core.staff_owns_customer(org_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := core.get_my_staff_id(org_id);
  IF v_staff_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM piano.customers pc
    WHERE pc.customer_id = customer_id
      AND pc.organization_id = org_id
      AND pc.teacher_id = v_staff_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.customers c
    WHERE c.id = customer_id
      AND c.organization_id = org_id
      AND c.metadata->>'teacherId' = v_staff_id::text
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM core.schedules s
    WHERE s.customer_id = customer_id
      AND s.organization_id = org_id
      AND s.staff_id = v_staff_id
  ) THEN
    RETURN true;
  END IF;

  -- 학부모: 담당 원생의 parentId로 연결
  IF EXISTS (
    SELECT 1 FROM core.customers stu
    WHERE stu.organization_id = org_id
      AND stu.metadata->>'entityType' = 'student'
      AND stu.metadata->>'parentId' = customer_id::text
      AND (
        EXISTS (
          SELECT 1 FROM piano.customers pc
          WHERE pc.customer_id = stu.id
            AND pc.organization_id = org_id
            AND pc.teacher_id = v_staff_id
        )
        OR stu.metadata->>'teacherId' = v_staff_id::text
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

/** 강사 담당 수업(서비스/반) — metadata.teacherId 또는 service_staff */
CREATE OR REPLACE FUNCTION core.staff_owns_service(org_id UUID, service_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.services s
    WHERE s.id = service_id
      AND s.organization_id = org_id
      AND (
        s.metadata->>'teacherId' = core.get_my_staff_id(org_id)::text
        OR EXISTS (
          SELECT 1 FROM core.service_staff ss
          WHERE ss.service_id = s.id
            AND ss.staff_id = core.get_my_staff_id(org_id)
        )
      )
  );
$$;

/** 연주회·콩쿠르 — metadata.participantIds 중 담당 원생 포함 */
CREATE OR REPLACE FUNCTION core.staff_can_access_event(org_id UUID, event_metadata JSONB)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(event_metadata->'participantIds', '[]'::jsonb)) AS pid
    WHERE core.staff_owns_customer(org_id, pid::uuid)
  );
$$;

GRANT EXECUTE ON FUNCTION core.get_my_staff_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_org_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.rls_staff_or_admin(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION core.staff_owns_customer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.staff_owns_service(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.staff_can_access_event(UUID, JSONB) TO authenticated;

-- =============================================
-- CORE: CUSTOMERS
-- =============================================

DROP POLICY IF EXISTS customers_select ON core.customers;
DROP POLICY IF EXISTS customers_insert ON core.customers;
DROP POLICY IF EXISTS customers_update ON core.customers;
DROP POLICY IF EXISTS customers_delete ON core.customers;

CREATE POLICY customers_select ON core.customers
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, id)));

CREATE POLICY customers_insert ON core.customers
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY customers_update ON core.customers
  FOR UPDATE TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, id)))
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, id)));

CREATE POLICY customers_delete ON core.customers
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: CUSTOMER CONTACTS
-- =============================================

DROP POLICY IF EXISTS customer_contacts_select ON core.customer_contacts;
DROP POLICY IF EXISTS customer_contacts_insert ON core.customer_contacts;
DROP POLICY IF EXISTS customer_contacts_update ON core.customer_contacts;
DROP POLICY IF EXISTS customer_contacts_delete ON core.customer_contacts;

CREATE POLICY customer_contacts_select ON core.customer_contacts
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY customer_contacts_insert ON core.customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY customer_contacts_update ON core.customer_contacts
  FOR UPDATE TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)))
  WITH CHECK (core.rls_staff_or_admin(organization_id, core.staff_owns_customer(organization_id, customer_id)));

CREATE POLICY customer_contacts_delete ON core.customer_contacts
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: SERVICES (classes / offerings)
-- =============================================

DROP POLICY IF EXISTS services_select ON core.services;
DROP POLICY IF EXISTS services_insert ON core.services;
DROP POLICY IF EXISTS services_update ON core.services;
DROP POLICY IF EXISTS services_delete ON core.services;

CREATE POLICY services_select ON core.services
  FOR SELECT TO authenticated
  USING (core.rls_staff_or_admin(organization_id, core.staff_owns_service(organization_id, id)));

CREATE POLICY services_insert ON core.services
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY services_update ON core.services
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY services_delete ON core.services
  FOR DELETE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- =============================================
-- CORE: SCHEDULES (bookings / attendance)
-- =============================================

DROP POLICY IF EXISTS schedules_select ON core.schedules;
DROP POLICY IF EXISTS schedules_insert ON core.schedules;
DROP POLICY IF EXISTS schedules_update ON core.schedules;
DROP POLICY IF EXISTS schedules_delete ON core.schedules;

CREATE POLICY schedules_select ON core.schedules
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
      OR (customer_id IS NOT NULL AND core.staff_owns_customer(organization_id, customer_id))
    )
  );

CREATE POLICY schedules_insert ON core.schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR (
      core.is_org_staff(organization_id)
      AND staff_id = core.get_my_staff_id(organization_id)
    )
  );

CREATE POLICY schedules_update ON core.schedules
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

CREATE POLICY schedules_delete ON core.schedules
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: PAYMENTS (admin only)
-- =============================================

DROP POLICY IF EXISTS payments_select ON core.payments;
DROP POLICY IF EXISTS payments_insert ON core.payments;
DROP POLICY IF EXISTS payments_update ON core.payments;
DROP POLICY IF EXISTS payments_delete ON core.payments;

CREATE POLICY payments_select ON core.payments
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY payments_insert ON core.payments
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY payments_update ON core.payments
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY payments_delete ON core.payments
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: PAYMENT TRANSACTIONS (admin only)
-- =============================================

DROP POLICY IF EXISTS payment_transactions_select ON core.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_insert ON core.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_delete ON core.payment_transactions;

CREATE POLICY payment_transactions_select ON core.payment_transactions
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY payment_transactions_insert ON core.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY payment_transactions_delete ON core.payment_transactions
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: CONSULTATIONS
-- =============================================

DROP POLICY IF EXISTS consultations_select ON core.consultations;
DROP POLICY IF EXISTS consultations_insert ON core.consultations;
DROP POLICY IF EXISTS consultations_update ON core.consultations;
DROP POLICY IF EXISTS consultations_delete ON core.consultations;

CREATE POLICY consultations_select ON core.consultations
  FOR SELECT TO authenticated
  USING (
    core.rls_staff_or_admin(
      organization_id,
      staff_id = core.get_my_staff_id(organization_id)
      OR core.staff_owns_customer(organization_id, customer_id)
    )
  );

CREATE POLICY consultations_insert ON core.consultations
  FOR INSERT TO authenticated
  WITH CHECK (
    core.is_org_admin(organization_id)
    OR (
      core.is_org_staff(organization_id)
      AND staff_id = core.get_my_staff_id(organization_id)
      AND core.staff_owns_customer(organization_id, customer_id)
    )
  );

CREATE POLICY consultations_update ON core.consultations
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

CREATE POLICY consultations_delete ON core.consultations
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CORE: NOTIFICATIONS (admin only)
-- =============================================

DROP POLICY IF EXISTS notifications_select ON core.notifications;
DROP POLICY IF EXISTS notifications_insert ON core.notifications;
DROP POLICY IF EXISTS notifications_update ON core.notifications;
DROP POLICY IF EXISTS notifications_delete ON core.notifications;

CREATE POLICY notifications_select ON core.notifications
  FOR SELECT TO authenticated
  USING (core.is_org_admin(organization_id));

CREATE POLICY notifications_insert ON core.notifications
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY notifications_update ON core.notifications
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id))
  WITH CHECK (core.is_org_admin(organization_id));

CREATE POLICY notifications_delete ON core.notifications
  FOR DELETE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- =============================================
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
