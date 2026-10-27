/**
 * 2026-09-28 core.teacher_payroll_settlements / core.customer_join_requests 테이블 권한 정적 검증 (DB 접속 없음)
 * - 20260928210000: authenticated 에 필요한 권한만 GRANT (anon/PUBLIC 없음, RLS 꺼져 있으면 중단)
 * - 이후 마이그레이션이 두 테이블 권한을 authenticated 에서 회수하거나 anon 에 열지 않는다
 * - 원장 hydrate(coreEntityHydrate)가 조회하는 core 테이블은 모두 authenticated 테이블 GRANT 가 선언돼 있어야 한다
 *   (core 일괄 GRANT 20260822000003 이전 생성 또는 명시적 GRANT). 권한 누락 = hydrate 403 = 전체 로드 실패 배너.
 * 기능 검증(로컬 Postgres): supabase/tests/grant_authenticated_payroll_join_requests.sql
 * 실행: npm run test:grant-authenticated-payroll-join-requests
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');
const MIGRATION = '20260928210000_grant_authenticated_payroll_join_requests.sql';
const BULK = '20260822000003_create_core_rls.sql';

const migDir = 'supabase/migrations';
const migrations = readdirSync(join(root, migDir)).filter((f) => f.endsWith('.sql')).sort();
const src = new Map(migrations.map((f) => [f, stripComments(read(`${migDir}/${f}`))]));

// 1) 마이그레이션 내용
assert.ok(migrations.includes(MIGRATION), `${MIGRATION} missing`);
const idx = migrations.indexOf(MIGRATION);
assert.ok(idx > 0 && migrations[idx - 1] >= '20260928200000', 'must come after 20260928200000');
const code = src.get(MIGRATION)!;
assert.match(
  code,
  /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE core\.teacher_payroll_settlements TO authenticated;/,
  'payroll grant',
);
assert.match(code, /GRANT SELECT, INSERT, UPDATE ON TABLE core\.customer_join_requests TO authenticated;/, 'join request grant');
assert.doesNotMatch(code, /\b(anon|PUBLIC|service_role)\b/, 'no grant to anon/PUBLIC/service_role');
assert.doesNotMatch(code, /\b(TRUNCATE|TRIGGER|REFERENCES|ALL PRIVILEGES|GRANT ALL)\b/i, 'no extra privileges');
assert.doesNotMatch(code, /customer_join_requests[^;]*\bDELETE\b|\bDELETE\b[^;]*customer_join_requests/i, 'no join request DELETE');
assert.doesNotMatch(code, /\b(POLICY|DISABLE ROW LEVEL SECURITY|REVOKE|DROP)\b/i, 'grant only: no policy/RLS/revoke/drop changes');
assert.match(code, /relrowsecurity/, 'RLS guard');
assert.match(code, /RAISE EXCEPTION/, 'guard raises');
assert.ok(code.indexOf('RAISE EXCEPTION') < code.indexOf('GRANT SELECT'), 'guard runs before GRANT');
assert.equal((code.match(/\bGRANT\b/g) || []).length, 2, 'exactly two GRANT statements');

// 2) 두 테이블 모두 RLS 가 켜지고 정책이 선언돼 있음
for (const t of ['teacher_payroll_settlements', 'customer_join_requests']) {
  const all = [...src.values()].join('\n');
  assert.match(all, new RegExp(`ALTER TABLE (IF EXISTS )?core\\.${t} ENABLE ROW LEVEL SECURITY`, 'i'), `${t}: RLS enabled`);
  assert.match(all, new RegExp(`CREATE POLICY [^;]*ON core\\.${t}\\b[^;]*TO authenticated`, 'i'), `${t}: authenticated policy`);
}

// 3) 이후 마이그레이션이 권한을 회수하거나 anon 에 열지 않음
for (const f of migrations.slice(idx + 1)) {
  const s = src.get(f)!;
  assert.doesNotMatch(
    s,
    /REVOKE[^;]*ON (TABLE )?core\.(teacher_payroll_settlements|customer_join_requests)\b[^;]*FROM[^;]*\bauthenticated\b/i,
    `${f} revokes payroll/join request privileges from authenticated`,
  );
}
for (const f of migrations) {
  assert.doesNotMatch(
    src.get(f)!,
    /GRANT[^;]*ON (TABLE )?core\.(teacher_payroll_settlements|customer_join_requests)\b[^;]*TO[^;]*\b(anon|PUBLIC)\b/i,
    `${f} grants payroll/join request to anon/PUBLIC`,
  );
}

// 4) hydrate 가 조회하는 core 테이블은 모두 authenticated 테이블 GRANT 가 선언돼 있음
assert.match(src.get(BULK) || '', /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO authenticated;/, 'bulk grant');
// 운영에는 권한이 있으나(2026-09-28 relacl 확인) 레포 마이그레이션에 GRANT 선언이 없는 기존 테이블 — 새로 추가 금지
const KNOWN_REMOTE_ONLY_GRANTS = new Set(['expenses', 'income_entries', 'attendance_sessions', 'parent_student_links']);
const hydrate = read('src/services/adapters/sync/coreEntityHydrate.ts');
const tables = [...new Set([...hydrate.matchAll(/client\.from\('([a-z_]+)'/g)].map((m) => m[1]))];
assert.ok(tables.includes('teacher_payroll_settlements') && tables.length >= 10, 'hydrate table list parsed');
const missing: string[] = [];
for (const t of tables) {
  const created = migrations.find((f) => new RegExp(`CREATE TABLE (IF NOT EXISTS )?core\\.${t}\\b`, 'i').test(src.get(f)!));
  assert.ok(created, `core.${t} has no CREATE TABLE migration`);
  if (created! <= BULK) continue;
  const granted = migrations.some((f) =>
    new RegExp(`GRANT[^;]*\\bSELECT\\b[^;]*\\bON (TABLE )?[^;]*\\bcore\\.${t}\\b[^;]*\\bTO\\b[^;]*\\bauthenticated\\b`, 'i').test(src.get(f)!),
  );
  if (!granted && !KNOWN_REMOTE_ONLY_GRANTS.has(t)) missing.push(t);
}
assert.deepEqual(missing, [], `hydrate tables without authenticated table GRANT: ${missing.join(', ')}`);

console.log(`grant-authenticated-payroll-join-requests: ok (${tables.length} hydrate tables, ${migrations.length} migrations)`);
