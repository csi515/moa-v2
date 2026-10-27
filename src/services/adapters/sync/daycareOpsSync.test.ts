/**
 * Daycare 운영 데이터 server SoT.
 * 실행: npm run test:daycare-ops
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAYCARE_SYNC_KEYS, LOCAL_ONLY_KEYS, STORAGE_KEYS, SUPABASE_SYNC_KEYS } from '../storageKeys';
import {
  childLegalRecordToRow,
  rowToChildLegalRecord,
  staffHealthCertToRow,
  rowToStaffHealthCert,
} from './daycareOpsMappers';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const OPS_KEYS = [
  STORAGE_KEYS.CARE_CHILD_RECORDS,
  STORAGE_KEYS.CARE_INCIDENTS,
  STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS,
  STORAGE_KEYS.CARE_SAFETY_LOGS,
  STORAGE_KEYS.CARE_MEAL_SAMPLES,
  STORAGE_KEYS.CARE_CCTV_REQUESTS,
  STORAGE_KEYS.CARE_PICKUP_LOGS,
] as const;

function run() {
  for (const key of OPS_KEYS) {
    assert.equal(DAYCARE_SYNC_KEYS.has(key), true, `${key} should sync`);
    assert.equal(SUPABASE_SYNC_KEYS.has(key), true, `${key} should be remote cache`);
    assert.equal(LOCAL_ONLY_KEYS.has(key), false, `${key} must not stay device-local`);
  }

  assert.equal(LOCAL_ONLY_KEYS.has(STORAGE_KEYS.CARE_JOURNALS), false);
  assert.equal(LOCAL_ONLY_KEYS.has(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS), true);

  const record = rowToChildLegalRecord({
    id: '11111111-1111-1111-1111-111111111111',
    customer_id: '22222222-2222-2222-2222-222222222222',
    vaccination_checked_at: '2026-03-01',
    health_check_date: null,
    allergy_note: '계란',
    authorized_pickups: [{ name: '엄마', relation: '모', phone: '010' }],
    metadata: { studentName: '아이' },
    created_at: '2026-09-24T00:00:00.000Z',
    updated_at: '2026-09-24T00:00:00.000Z',
  });
  assert.equal(record.studentName, '아이');
  assert.equal(record.authorizedPickups[0]?.name, '엄마');
  const row = childLegalRecordToRow(record, 'org-1');
  assert.equal(row.organization_id, 'org-1');
  assert.equal(row.customer_id, record.studentId);

  const cert = rowToStaffHealthCert({
    id: '33333333-3333-3333-3333-333333333333',
    staff_id: '44444444-4444-4444-4444-444444444444',
    expires_at: '2026-12-31',
    metadata: { teacherName: '교사' },
    created_at: '2026-09-24T00:00:00.000Z',
    updated_at: '2026-09-24T00:00:00.000Z',
  });
  assert.equal(cert.teacherName, '교사');
  assert.equal(staffHealthCertToRow(cert, 'org-1').staff_id, cert.teacherId);

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924370000_daycare_ops_tables.sql'),
    'utf8'
  );
  for (const table of [
    'care_child_records',
    'care_incidents',
    'care_staff_health_certs',
    'care_safety_logs',
    'care_meal_samples',
    'care_cctv_requests',
    'care_pickup_logs',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS core\\.${table}`));
    assert.match(sql, new RegExp(`ENABLE ROW LEVEL SECURITY`));
    assert.match(sql, new RegExp(`${table}.*organization_id|organization_id.*${table}`));
  }
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /parent_owns_student/);
  assert.match(sql, /care_cctv_requests_staff/);
  assert.doesNotMatch(sql, /CREATE TABLE core\.care_journals/);

  const hydrate = readFileSync(join(here, 'daycareEntitySync.ts'), 'utf8');
  assert.match(hydrate, /hydrateDaycareOpsEntities/);
  assert.match(hydrate, /persistDaycareOpsEntity/);

  const ops = readFileSync(join(here, 'daycareOpsSync.ts'), 'utf8');
  assert.match(ops, /mergeLocalExtras/);
  assert.match(ops, /applyDirtyListMerge/);
  assert.match(ops, /upsertThenDiffDelete/);

  const storage = readFileSync(join(root, 'src/industries/daycare/care/careStorage.ts'), 'utf8');
  assert.match(storage, /SoT는 core\.care_/);

  console.log('daycareOpsSync.test.ts: ok');
}

run();
