-- Phase 5b: Staff-scoped RLS — core schema policies
-- (Helper functions in 20260822130000_staff_scoped_rls.sql)

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

DROP POLICY IF EXISTS payments_select ON core.payments;
DROP POLICY IF EXISTS payments_insert ON core.payments;
DROP POLICY IF EXISTS payments_update ON core.payments;
DROP POLICY IF EXISTS payments_delete ON core.payments;

CREATE POLICY payments_select ON core.payments
  FOR SELECT TO authenticated USING (core.is_org_admin(organization_id));
CREATE POLICY payments_insert ON core.payments
  FOR INSERT TO authenticated WITH CHECK (core.is_org_admin(organization_id));
CREATE POLICY payments_update ON core.payments
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));
CREATE POLICY payments_delete ON core.payments
  FOR DELETE TO authenticated USING (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS payment_transactions_select ON core.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_insert ON core.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_delete ON core.payment_transactions;

CREATE POLICY payment_transactions_select ON core.payment_transactions
  FOR SELECT TO authenticated USING (core.is_org_admin(organization_id));
CREATE POLICY payment_transactions_insert ON core.payment_transactions
  FOR INSERT TO authenticated WITH CHECK (core.is_org_admin(organization_id));
CREATE POLICY payment_transactions_delete ON core.payment_transactions
  FOR DELETE TO authenticated USING (core.is_org_admin(organization_id));

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
  FOR DELETE TO authenticated USING (core.is_org_admin(organization_id));

DROP POLICY IF EXISTS notifications_select ON core.notifications;
DROP POLICY IF EXISTS notifications_insert ON core.notifications;
DROP POLICY IF EXISTS notifications_update ON core.notifications;
DROP POLICY IF EXISTS notifications_delete ON core.notifications;

CREATE POLICY notifications_select ON core.notifications
  FOR SELECT TO authenticated USING (core.is_org_admin(organization_id));
CREATE POLICY notifications_insert ON core.notifications
  FOR INSERT TO authenticated WITH CHECK (core.is_org_admin(organization_id));
CREATE POLICY notifications_update ON core.notifications
  FOR UPDATE TO authenticated
  USING (core.is_org_admin(organization_id)) WITH CHECK (core.is_org_admin(organization_id));
CREATE POLICY notifications_delete ON core.notifications
  FOR DELETE TO authenticated USING (core.is_org_owner_or_admin(organization_id));
