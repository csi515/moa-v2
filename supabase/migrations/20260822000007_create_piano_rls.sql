-- Phase 4: Row Level Security for piano schema

ALTER TABLE piano.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.lesson_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.practice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.textbook_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.textbook_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.textbook_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE piano.songs ENABLE ROW LEVEL SECURITY;

-- piano.customers
CREATE POLICY piano_customers_select ON piano.customers
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_customers_insert ON piano.customers
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_customers_update ON piano.customers
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_customers_delete ON piano.customers
  FOR DELETE USING (core.is_org_admin(organization_id));

-- piano.class_members
CREATE POLICY piano_class_members_select ON piano.class_members
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_class_members_insert ON piano.class_members
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_class_members_delete ON piano.class_members
  FOR DELETE USING (core.is_org_member(organization_id));

-- piano.attendance
CREATE POLICY piano_attendance_select ON piano.attendance
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_attendance_insert ON piano.attendance
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_attendance_update ON piano.attendance
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_attendance_delete ON piano.attendance
  FOR DELETE USING (core.is_org_member(organization_id));

-- piano.lesson_records
CREATE POLICY piano_lesson_records_select ON piano.lesson_records
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_lesson_records_insert ON piano.lesson_records
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_lesson_records_update ON piano.lesson_records
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_lesson_records_delete ON piano.lesson_records
  FOR DELETE USING (core.is_org_member(organization_id));

-- piano.practice_records
CREATE POLICY piano_practice_records_select ON piano.practice_records
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_practice_records_insert ON piano.practice_records
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_practice_records_update ON piano.practice_records
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_practice_records_delete ON piano.practice_records
  FOR DELETE USING (core.is_org_member(organization_id));

-- piano.textbooks
CREATE POLICY piano_textbooks_select ON piano.textbooks
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_textbooks_insert ON piano.textbooks
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_textbooks_update ON piano.textbooks
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_textbooks_delete ON piano.textbooks
  FOR DELETE USING (core.is_org_admin(organization_id));

-- piano.textbook_sales
CREATE POLICY piano_textbook_sales_select ON piano.textbook_sales
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_textbook_sales_insert ON piano.textbook_sales
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_textbook_sales_update ON piano.textbook_sales
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_textbook_sales_delete ON piano.textbook_sales
  FOR DELETE USING (core.is_org_admin(organization_id));

-- piano.textbook_payments
CREATE POLICY piano_textbook_payments_select ON piano.textbook_payments
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_textbook_payments_insert ON piano.textbook_payments
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_textbook_payments_delete ON piano.textbook_payments
  FOR DELETE USING (core.is_org_admin(organization_id));

-- piano.textbook_inventory_transactions
CREATE POLICY piano_inventory_select ON piano.textbook_inventory_transactions
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_inventory_insert ON piano.textbook_inventory_transactions
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_inventory_delete ON piano.textbook_inventory_transactions
  FOR DELETE USING (core.is_org_admin(organization_id));

-- piano.songs
CREATE POLICY piano_songs_select ON piano.songs
  FOR SELECT USING (core.is_org_member(organization_id));
CREATE POLICY piano_songs_insert ON piano.songs
  FOR INSERT WITH CHECK (core.is_org_member(organization_id));
CREATE POLICY piano_songs_update ON piano.songs
  FOR UPDATE USING (core.is_org_member(organization_id));
CREATE POLICY piano_songs_delete ON piano.songs
  FOR DELETE USING (core.is_org_member(organization_id));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA piano TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA piano TO anon;
