/**
 * Supabase 보안 경계(RLS & RPC Boundaries) 하드닝 정적 검증
 * 실행: npm run test:security-boundary-harden
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase/migrations');
const MIGRATION = '20260930200000_harden_security_boundaries.sql';

const migrations = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
assert.ok(migrations.includes(MIGRATION), `${MIGRATION} file must exist`);

const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');
const sql = stripComments(readFileSync(join(migDir, MIGRATION), 'utf8'));

// 1. 내부 전용 함수들에 대한 REVOKE PUBLIC, anon, authenticated 검증
const internalSecDefs = [
  'book_room_reservation_guarded',
  'ensure_org_parent_customer',
  'merge_parent_created_student_if_duplicate',
  'sync_guardians_for_parent_org',
];

for (const fn of internalSecDefs) {
  assert.match(
    sql,
    new RegExp(`REVOKE ALL ON FUNCTION core\\.${fn}[^;]*FROM PUBLIC, anon, authenticated;`, 'i'),
    `Function core.${fn} must revoke execute from PUBLIC, anon, authenticated`
  );
  assert.match(
    sql,
    new RegExp(`GRANT EXECUTE ON FUNCTION core\\.${fn}[^;]*TO postgres, service_role;`, 'i'),
    `Function core.${fn} must grant execute only to postgres, service_role`
  );
}

// 2. core.reservations direct INSERT 차단 검증
assert.match(sql, /DROP POLICY IF EXISTS reservations_insert_authenticated ON core\.reservations;/);
assert.match(sql, /CREATE POLICY reservations_insert_deny ON core\.reservations/);
assert.match(sql, /FOR INSERT TO authenticated[\s\S]*?WITH CHECK \(false\);/);

// 3. core.room_reservations direct INSERT 차단 및 셀프 UPDATE 하드닝 검증
assert.match(sql, /DROP POLICY IF EXISTS room_reservations_insert ON core\.room_reservations;/);
assert.match(sql, /CREATE POLICY room_reservations_insert_deny ON core\.room_reservations/);
assert.match(sql, /FOR INSERT TO authenticated[\s\S]*?WITH CHECK \(false\);/);

assert.match(sql, /DROP POLICY IF EXISTS room_reservations_update_self ON core\.room_reservations;/);
assert.match(sql, /CREATE POLICY room_reservations_update_self_cancel ON core\.room_reservations/);
assert.match(
  sql,
  /USING\s*\(\s*requested_by = auth\.uid\(\)\s*AND\s*status = 'pending'\s*\)[\s\S]*?WITH CHECK\s*\(\s*requested_by = auth\.uid\(\)\s*AND\s*status = 'cancelled'\s*\);/
);

// 4. core.guardian_enrollment_requests SELECT 멤버 스코프 축소 검증
assert.match(sql, /DROP POLICY IF EXISTS guardian_enrollment_requests_admin_select ON core\.guardian_enrollment_requests;/);
assert.match(sql, /CREATE POLICY guardian_enrollment_requests_admin_select ON core\.guardian_enrollment_requests/);
assert.match(sql, /core\.is_org_staff_actor\(organization_id\)/);
assert.doesNotMatch(
  sql.match(/CREATE POLICY guardian_enrollment_requests_admin_select[\s\S]*?;/)?.[0] ?? '',
  /is_org_member/
);

console.log('security-boundary-harden.test: ok');
console.log(
  JSON.stringify(
    {
      internalFunctionsSecured: internalSecDefs,
      reservationDirectInsertBlocked: ['core.reservations', 'core.room_reservations'],
      roomReservationSelfApprovalBlocked: 'core.room_reservations (only pending -> cancelled allowed)',
      guardianEnrollmentRequestsScoped: 'core.guardian_enrollment_requests (is_org_staff_actor only)',
    },
    null,
    2
  )
);
