/**
 * session_passes ↔ customers 조직 정합성 마이그레이션 계약
 * 실행: npm run test:session-pass-org-integrity
 *
 * DB 제약: composite FK (customer_id, organization_id) → customers(id, organization_id)
 * RLS와 별개. RPC 재작성 없음.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const integrityPath = join(
  root,
  'supabase/migrations/20260924100000_session_pass_customer_org_integrity.sql'
);
const createPassPath = join(
  root,
  'supabase/migrations/20260922210000_session_passes_booking_status_atomic.sql'
);
const hardenPath = join(
  root,
  'supabase/migrations/20260922220000_harden_member_scoped_rls.sql'
);

const integritySql = readFileSync(integrityPath, 'utf8');
const createPassSql = readFileSync(createPassPath, 'utf8');
const hardenSql = readFileSync(hardenPath, 'utf8');

assert.match(createPassSql, /customer_id\s+UUID NOT NULL REFERENCES core\.customers\(id\)/);

assert.match(integritySql, /organization_id IS DISTINCT FROM sp\.organization_id/);
assert.match(integritySql, /session_passes_customer_org_fkey/);
assert.match(integritySql, /customers_id_organization_id_key/);
assert.match(integritySql, /UNIQUE \(id, organization_id\)/);
assert.match(
  integritySql,
  /FOREIGN KEY \(customer_id, organization_id\)[\s\S]*REFERENCES core\.customers \(id, organization_id\)/
);
assert.match(integritySql, /ALTER COLUMN customer_id SET NOT NULL/);
assert.doesNotMatch(integritySql, /CREATE OR REPLACE FUNCTION core\.update_booking_status_with_pass/);

assert.match(hardenSql, /CREATE OR REPLACE FUNCTION core\.update_booking_status_with_pass/);
assert.match(hardenSql, /UPDATE core\.session_passes/);

console.log('sessionPassOrgIntegrity.test.ts: ok');
console.log(
  JSON.stringify(
    {
      enforcement: 'composite FK session_passes(customer_id, organization_id) → customers(id, organization_id)',
      appliesTo: ['INSERT', 'UPDATE customer_id', 'UPDATE organization_id'],
      customerIdNull: 'forbidden',
      rpc: 'update_booking_status_with_pass unchanged',
    },
    null,
    2
  )
);
