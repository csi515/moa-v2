/**
 * atomic booking RPC 계약 (정적). 실행: npm run test:booking-pass-atomic-contract
 * live 시나리오 A–I 는 test:booking-pass-atomic-db
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const harden = readFileSync(
  join(root, 'supabase/migrations/20260922220000_harden_member_scoped_rls.sql'),
  'utf8'
);
const lockMig = readFileSync(
  join(root, 'supabase/migrations/20260924110000_harden_session_pass_lock_and_refund.sql'),
  'utf8'
);
const unit = readFileSync(
  join(root, 'src/core/schedules/bookingPassAtomic.test.ts'),
  'utf8'
);
const dbIt = readFileSync(join(root, 'scripts/bookingPassAtomicDb.test.ts'), 'utf8');

assert.match(harden, /CREATE OR REPLACE FUNCTION core\.update_booking_status_with_pass/);
assert.match(harden, /SECURITY DEFINER/);
assert.match(harden, /FOR UPDATE/);
assert.match(harden, /IF NOT core\.is_org_staff_actor\(p_organization_id\)/);
assert.match(harden, /Organization mismatch/);
assert.match(harden, /Insufficient session pass/);
assert.match(harden, /Permission denied/);
const rpcBody = harden.match(
  /CREATE OR REPLACE FUNCTION core\.update_booking_status_with_pass[\s\S]*?AS \$\$([\s\S]*?)\$\$;/
)?.[1];
assert.ok(rpcBody, 'RPC body not found');
assert.doesNotMatch(rpcBody, /\bCOMMIT\b/);
assert.doesNotMatch(rpcBody, /autonomous transaction/i);

assert.match(lockMig, /LIMIT 1\s+FOR UPDATE/);
assert.match(lockMig, /v_pass_consumable/);
assert.match(lockMig, /Session pass refund failed/);
assert.match(lockMig, /AND used_sessions < total_sessions/);
assert.match(lockMig, /status <> 'cancelled'/);

assert.match(unit, /modelAtomicStatusChange/);
assert.match(unit, /simulateSerialized/);

assert.match(dbIt, /A\. scheduled → completed/);
assert.match(dbIt, /B\. completed → cancelled/);
assert.match(dbIt, /C\. completed → completed/);
assert.match(dbIt, /D\. 이용권 부족/);
assert.match(dbIt, /E\. 조직 불일치/);
assert.match(dbIt, /F\. customer\/parent/);
assert.match(dbIt, /G\. staff/);
assert.match(dbIt, /H\. 동시 completed/);
assert.match(dbIt, /I\. 중간 실패/);
assert.match(dbIt, /J\. cancelled pass refund 실패/);
assert.match(dbIt, /K\. expired pass consume 실패/);
assert.match(dbIt, /RLS_AUDIT_ORG_A_ID/);
assert.match(dbIt, /Promise\.all/);

console.log('bookingPassAtomicContract.test.ts: ok');
