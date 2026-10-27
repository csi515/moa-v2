-- Phase 0: Auth triggers and helper functions

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  INSERT INTO core.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION core.handle_new_user();

-- Create organization and assign creator as owner
CREATE OR REPLACE FUNCTION core.create_organization(
  p_name TEXT,
  p_industry_type TEXT DEFAULT 'piano',
  p_slug TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO core.organizations (name, industry_type, slug)
  VALUES (p_name, p_industry_type, p_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO core.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION core.create_organization(TEXT, TEXT, TEXT) TO authenticated;

-- Sync payment paid_amount when transactions are added
CREATE OR REPLACE FUNCTION core.sync_payment_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
  v_total_paid NUMERIC(12, 2);
  v_billed NUMERIC(12, 2);
  v_new_status core.payment_status;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM core.payment_transactions
  WHERE payment_id = NEW.payment_id;

  SELECT billed_amount INTO v_billed
  FROM core.payments
  WHERE id = NEW.payment_id;

  IF v_total_paid >= v_billed AND v_billed > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  UPDATE core.payments
  SET
    paid_amount = v_total_paid,
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = NEW.payment_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_payment_after_transaction
  AFTER INSERT ON core.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION core.sync_payment_from_transaction();
