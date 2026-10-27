-- Phase 0: Row Level Security policies for core schema

-- =============================================
-- RLS HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION core.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION core.get_org_role(org_id UUID)
RETURNS core.member_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT role
  FROM core.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION core.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) IN ('owner', 'admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION core.is_org_owner_or_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = core, public
AS $$
  SELECT core.get_org_role(org_id) IN ('owner', 'admin');
$$;

GRANT EXECUTE ON FUNCTION core.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.get_org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_org_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION core.is_org_owner_or_admin(UUID) TO authenticated;

-- Enable RLS on all core tables
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.service_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES
-- =============================================

CREATE POLICY profiles_select_own ON core.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON core.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_own ON core.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Members can view profiles of users in the same organization
CREATE POLICY profiles_select_org_members ON core.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.organization_members om1
      JOIN core.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = core.profiles.id
        AND om1.is_active = true
        AND om2.is_active = true
    )
  );

-- =============================================
-- ORGANIZATIONS
-- =============================================

CREATE POLICY organizations_select ON core.organizations
  FOR SELECT TO authenticated
  USING (core.is_org_member(id));

CREATE POLICY organizations_insert ON core.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY organizations_update ON core.organizations
  FOR UPDATE TO authenticated
  USING (core.is_org_owner_or_admin(id))
  WITH CHECK (core.is_org_owner_or_admin(id));

-- =============================================
-- ORGANIZATION MEMBERS
-- =============================================

CREATE POLICY organization_members_select ON core.organization_members
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY organization_members_insert ON core.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow self-insert as owner when creating a new org (handled by trigger)
    user_id = auth.uid()
    OR core.is_org_owner_or_admin(organization_id)
  );

CREATE POLICY organization_members_update ON core.organization_members
  FOR UPDATE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id))
  WITH CHECK (core.is_org_owner_or_admin(organization_id));

CREATE POLICY organization_members_delete ON core.organization_members
  FOR DELETE TO authenticated
  USING (core.is_org_owner_or_admin(organization_id));

-- =============================================
-- CUSTOMERS
-- =============================================

CREATE POLICY customers_select ON core.customers
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY customers_insert ON core.customers
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY customers_update ON core.customers
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY customers_delete ON core.customers
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CUSTOMER CONTACTS
-- =============================================

CREATE POLICY customer_contacts_select ON core.customer_contacts
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY customer_contacts_insert ON core.customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY customer_contacts_update ON core.customer_contacts
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY customer_contacts_delete ON core.customer_contacts
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- STAFF
-- =============================================

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
-- SERVICES
-- =============================================

CREATE POLICY services_select ON core.services
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

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
-- SERVICE STAFF
-- =============================================

CREATE POLICY service_staff_select ON core.service_staff
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.services s
      WHERE s.id = service_staff.service_id
        AND core.is_org_member(s.organization_id)
    )
  );

CREATE POLICY service_staff_insert ON core.service_staff
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.services s
      WHERE s.id = service_staff.service_id
        AND core.is_org_admin(s.organization_id)
    )
  );

CREATE POLICY service_staff_delete ON core.service_staff
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.services s
      WHERE s.id = service_staff.service_id
        AND core.is_org_admin(s.organization_id)
    )
  );

-- =============================================
-- SCHEDULES
-- =============================================

CREATE POLICY schedules_select ON core.schedules
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY schedules_insert ON core.schedules
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY schedules_update ON core.schedules
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY schedules_delete ON core.schedules
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PAYMENTS
-- =============================================

CREATE POLICY payments_select ON core.payments
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY payments_insert ON core.payments
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY payments_update ON core.payments
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY payments_delete ON core.payments
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- PAYMENT TRANSACTIONS
-- =============================================

CREATE POLICY payment_transactions_select ON core.payment_transactions
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY payment_transactions_insert ON core.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY payment_transactions_delete ON core.payment_transactions
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- CONSULTATIONS
-- =============================================

CREATE POLICY consultations_select ON core.consultations
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

CREATE POLICY consultations_insert ON core.consultations
  FOR INSERT TO authenticated
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY consultations_update ON core.consultations
  FOR UPDATE TO authenticated
  USING (core.is_org_member(organization_id))
  WITH CHECK (core.is_org_member(organization_id));

CREATE POLICY consultations_delete ON core.consultations
  FOR DELETE TO authenticated
  USING (core.is_org_admin(organization_id));

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE POLICY notifications_select ON core.notifications
  FOR SELECT TO authenticated
  USING (core.is_org_member(organization_id));

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
-- TABLE GRANTS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO authenticated;
