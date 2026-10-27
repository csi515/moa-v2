import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20261012120000_jwt_revocation_rls.sql');
const code = stripComments(sql);

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const bodyStart = code.indexOf('$$', start);
  const bodyEnd = code.indexOf('$$', bodyStart + 2);
  return code.slice(start, bodyEnd + 2);
}

// 1. organization_members token_version column and comment
{
  assert.match(code, /ALTER TABLE core\.organization_members/);
  assert.match(code, /ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1/);
}

// 2. Trigger for automatic token_version bump on deactivation or role change
{
  const bumpBody = functionBlock('core.handle_member_token_version_bump');
  assert.match(bumpBody, /OLD\.is_active IS DISTINCT FROM NEW\.is_active AND NOT NEW\.is_active/);
  assert.match(bumpBody, /OLD\.role IS DISTINCT FROM NEW\.role/);
  assert.match(bumpBody, /NEW\.token_version := COALESCE\(OLD\.token_version, 1\) \+ 1/);

  assert.match(code, /DROP TRIGGER IF EXISTS trg_bump_member_token_version ON core\.organization_members/);
  assert.match(code, /CREATE TRIGGER trg_bump_member_token_version/);
  assert.match(code, /BEFORE UPDATE ON core\.organization_members/);
}

// 3. Admin revocation RPC: core.revoke_member_token
{
  const revokeBody = functionBlock('core.revoke_member_token');
  assert.match(revokeBody, /IF auth\.uid\(\) IS NULL THEN/);
  assert.match(revokeBody, /IF NOT core\.is_org_admin\(p_organization_id\) THEN/);
  assert.match(revokeBody, /UPDATE core\.organization_members/);
  assert.match(revokeBody, /token_version = token_version \+ 1/);
  assert.match(revokeBody, /is_active = false/);
  assert.match(code, /GRANT EXECUTE ON FUNCTION core\.revoke_member_token\(UUID, UUID\) TO authenticated/);
}

// 4. Token validation helpers comparing DB token_version with JWT claim
{
  const staffHelper = functionBlock('core.has_valid_staff_token');
  assert.match(staffHelper, /m\.organization_id = p_organization_id/);
  assert.match(staffHelper, /m\.user_id = auth\.uid\(\)/);
  assert.match(staffHelper, /m\.is_active = true/);
  assert.match(staffHelper, /m\.token_version <= COALESCE\(/);
  assert.match(staffHelper, /auth\.jwt\(\) ->> 'token_version'/);

  const ownerHelper = functionBlock('core.has_valid_owner_token');
  assert.match(ownerHelper, /m\.role = 'owner'::core\.member_role/);
  assert.match(ownerHelper, /m\.token_version <= COALESCE\(/);

  assert.match(code, /GRANT EXECUTE ON FUNCTION core\.has_valid_staff_token\(UUID\) TO authenticated/);
  assert.match(code, /GRANT EXECUTE ON FUNCTION core\.has_valid_owner_token\(UUID\) TO authenticated/);
}

// 5. Sensitive revenue / financial tables guarded by token_version RLS
{
  // sales & sale_items & sale_returns
  assert.match(code, /CREATE POLICY core_sales_select\s+ON core\.sales[\s\S]*?has_valid_staff_token/);
  assert.match(code, /CREATE POLICY core_sale_items_select\s+ON core\.sale_items[\s\S]*?has_valid_staff_token/);
  assert.match(code, /CREATE POLICY core_sale_returns_select\s+ON core\.sale_returns[\s\S]*?has_valid_staff_token/);

  // payments & payment_transactions
  assert.match(code, /CREATE POLICY payments_select\s+ON core\.payments[\s\S]*?has_valid_staff_token/);
  assert.match(code, /CREATE POLICY payment_transactions_select\s+ON core\.payment_transactions[\s\S]*?has_valid_staff_token/);

  // expenses (owner-only)
  assert.match(code, /CREATE POLICY core_expenses_select ON core\.expenses[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_expenses_insert ON core\.expenses[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_expenses_update ON core\.expenses[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_expenses_delete ON core\.expenses[\s\S]*?has_valid_owner_token/);

  // income_entries (owner-only)
  assert.match(code, /CREATE POLICY core_income_select ON core\.income_entries[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_income_insert ON core\.income_entries[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_income_update ON core\.income_entries[\s\S]*?has_valid_owner_token/);
  assert.match(code, /CREATE POLICY core_income_delete ON core\.income_entries[\s\S]*?has_valid_owner_token/);
}

console.log('jwt-revocation-rls test passed');
