/**
 * Account Linking & Token RPC Security Audit & Invariant Test
 * 
 * Verifies that:
 * 1. core.link_toss_customer_by_phone has execute REVOKED from authenticated and anon,
 *    restricted strictly to service_role (Edge Function execution only).
 * 2. auth.role() is checked inside core.link_toss_customer_by_phone as defense-in-depth.
 * 3. Already claimed customer records are protected against hijacking in link_toss_customer_by_phone.
 * 4. Staff membership in link_toss_customer_by_phone is scoped to customer tenant and checks is_active.
 * 5. core.claim_store_token_v2 & claim_store_token enforce issuer_type = 'STORE'.
 * 6. Customer lookup in claim_store_token(_v2) enforces organization_id = v_token_rec.tenant_id.
 * 7. Hijack defense in claim_store_token_v2 atomically increments and persists attempt_count.
 * 8. core.consume_customer_qr enforces issuer_type = 'CUSTOMER'.
 * 9. core.claim_staff_invite preserves 'owner' role against privilege demotion.
 * 10. supabase/functions/auth-toss/index.ts calls atomic RPC rather than direct unsafe customer update.
 *
 * Run: npx tsx scripts/account-linking-rpc-security.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase/migrations');
const MIGRATION = '20261011110000_account_linking_rpc_security_hardening.sql';

const migrations = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
assert.ok(migrations.includes(MIGRATION), `${MIGRATION} must exist in supabase/migrations`);

const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');
const sql = stripComments(readFileSync(join(migDir, MIGRATION), 'utf8'));

function functionBlock(name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined in ${MIGRATION}`);
  const m = /AS\s+(\$[A-Za-z_]*\$)/.exec(sql.slice(start));
  assert.ok(m, `${name}: body delimiter not found`);
  const tag = m[1];
  const bodyStart = start + m.index + m[0].length;
  const bodyEnd = sql.indexOf(tag, bodyStart);
  assert.ok(bodyEnd > bodyStart, `${name}: body end not found`);
  return sql.slice(start, bodyEnd + tag.length);
}

console.log('[1] Auditing core.link_toss_customer_by_phone security boundaries...');
{
  const fn = functionBlock('core.link_toss_customer_by_phone');

  // Defense-in-depth: check role
  assert.match(fn, /v_role\s*:=\s*auth\.role\(\)/, 'Must inspect auth.role()');
  assert.match(fn, /v_role\s*<>\s*'service_role'/, 'Must require service_role');

  // Hijack defense: cannot hijack existing claimed customer
  assert.match(fn, /v_cust_rec\.auth_user_id\s*IS\s*NOT\s*NULL\s*AND\s*v_cust_rec\.auth_user_id\s*<>\s*p_user_id/, 'Must block hijacking existing claimed account');

  // Staff check must be scoped to customer organization and active status
  assert.match(fn, /organization_id\s*=\s*v_cust_rec\.organization_id/, 'Must scope staff check to customer organization');
  assert.match(fn, /is_active\s*=\s*true/, 'Must check is_active = true for staff role');

  // Optional p_org_id filter support
  assert.match(fn, /p_org_id\s+UUID\s+DEFAULT\s+NULL/, 'Must support optional p_org_id parameter');
  assert.match(fn, /\(p_org_id\s+IS\s+NULL\s+OR\s+organization_id\s*=\s*p_org_id\)/, 'Must filter customers by p_org_id if supplied');

  // Permissions: REVOKED from authenticated and anon
  assert.match(sql, /REVOKE\s+ALL\s+ON\s+FUNCTION\s+core\.link_toss_customer_by_phone\([^)]*\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
  assert.match(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+core\.link_toss_customer_by_phone\([^)]*\)\s+TO\s+postgres,\s*service_role/i);
  assert.doesNotMatch(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+core\.link_toss_customer_by_phone[^;]*TO\s+authenticated/i, 'Must NEVER grant link_toss_customer_by_phone to authenticated');
}
console.log('    -> PASS: core.link_toss_customer_by_phone permissions and safeguards verified.');

console.log('[2] Auditing core.claim_store_token_v2 & v1 token checks & tenant isolation...');
{
  const v2 = functionBlock('core.claim_store_token_v2');

  // Must enforce issuer_type = 'STORE'
  assert.match(v2, /issuer_type\s*=\s*'STORE'/, 'claim_store_token_v2 must enforce issuer_type = STORE');

  // Must enforce tenant scope on customer
  assert.match(v2, /organization_id\s*=\s*v_token_rec\.tenant_id/, 'claim_store_token_v2 must scope customer to token tenant');

  // Must persist attempt_count atomically upon hijack attempt
  assert.match(v2, /attempt_count\s*=\s*attempt_count\s*\+\s*1/, 'Must increment attempt_count on failed attempt');
  assert.match(v2, /BLOCKED_ALREADY_CLAIMED/, 'Must return blocked status on account already claimed');
  assert.match(v2, /MAX_ATTEMPTS_EXCEEDED/, 'Must enforce max_attempts');

  const v1 = functionBlock('core.claim_store_token');
  assert.match(v1, /issuer_type\s*=\s*'STORE'/, 'claim_store_token v1 must enforce issuer_type = STORE');
  assert.match(v1, /organization_id\s*=\s*v_token_rec\.tenant_id/, 'claim_store_token v1 must scope customer to token tenant');
  assert.match(v1, /v_cust_auth\s*IS\s*NOT\s*NULL\s*AND\s*v_cust_auth\s*<>\s*v_uid/, 'claim_store_token v1 must defend against account hijack');

  // Public wrappers
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.claim_store_token_v2/);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.claim_store_token\(/);
}
console.log('    -> PASS: claim_store_token_v2 & v1 issuer_type, tenant scoping & rate limiting verified.');

console.log('[3] Auditing core.consume_customer_qr token isolation...');
{
  const qr = functionBlock('core.consume_customer_qr');
  assert.match(qr, /issuer_type\s*=\s*'CUSTOMER'/, 'consume_customer_qr must strictly enforce issuer_type = CUSTOMER');
}
console.log('    -> PASS: consume_customer_qr strictly accepts only CUSTOMER issuer_type.');

console.log('[4] Auditing core.claim_staff_invite role & privilege demotion defense...');
{
  const staff = functionBlock('core.claim_staff_invite');
  assert.match(staff, /issuer_type\s*=\s*'STORE_STAFF_INVITE'/, 'claim_staff_invite must enforce issuer_type = STORE_STAFF_INVITE');
  assert.match(staff, /CASE\s+WHEN\s+core\.organization_members\.role\s*=\s*'owner'\s+THEN\s*'owner'\s+ELSE\s*'staff'\s+END/, 'Must never demote an existing owner to staff');
}
console.log('    -> PASS: claim_staff_invite preserves owner role on claim conflict.');

console.log('[5] Auditing supabase/functions/auth-toss/index.ts implementation...');
{
  const tossFn = readFileSync(join(root, 'supabase/functions/auth-toss/index.ts'), 'utf8');

  // Must call link_toss_customer_by_phone RPC
  assert.match(tossFn, /admin\.rpc\(\s*["']link_toss_customer_by_phone["']/, 'auth-toss must invoke link_toss_customer_by_phone RPC');

  // Must not do unverified direct updates to customers table during exchange_code
  const exchangeBlock = tossFn.slice(tossFn.indexOf('action === "exchange_code"'));
  assert.doesNotMatch(exchangeBlock, /admin\s*\.from\(["']customers["']\)\s*\.update\(/, 'auth-toss exchange_code must not do direct unchecked update on customers');

  // Must check active membership and prioritize matchedOrgId
  assert.match(tossFn, /\.eq\(["']is_active["'],\s*true\)/, 'auth-toss must check active organization membership');
  assert.match(tossFn, /matchedOrgId/, 'auth-toss must scope role resolution to matched customer organization');
}
console.log('    -> PASS: auth-toss edge function integrates safely with link_toss_customer_by_phone.');

console.log('[6] Auditing ClaimTokenPage.tsx client error handling...');
{
  const claimPage = readFileSync(join(root, 'src/pages/customer/ClaimTokenPage.tsx'), 'utf8');
  assert.match(claimPage, /\(data\s+as\s+any\)\?\.error/, 'ClaimTokenPage must forward server error message for hijack defense display');
  assert.match(claimPage, /msg\.includes\(['"]hijack['"]\)/, 'ClaimTokenPage must handle hijack defense message in UI');
}
console.log('    -> PASS: ClaimTokenPage client error handling verified.');

console.log('\nAll Account Linking & RPC Security Audit tests passed successfully!');
