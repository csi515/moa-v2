import assert from 'node:assert/strict';
import { ROLE_PERMISSION_KEYS } from './permissions';
import {
  getPermissionCatalogGroupsForMatrix,
  getPermissionLabel,
  listCatalogKeys,
} from './permissionCatalog';

assert.deepEqual(
  [...listCatalogKeys()].sort(),
  [...ROLE_PERMISSION_KEYS].sort(),
  'permissionCatalog must cover every ROLE_PERMISSION_KEYS entry'
);

assert.equal(getPermissionLabel('volunteer:manage'), '봉사활동 게시·모집 관리');
assert.equal(getPermissionLabel('meal_survey:manage'), '식수인원 조사 관리');
assert.equal(getPermissionLabel('office_supply_request:manage'), '사무용품 취합 관리');
assert.equal(getPermissionLabel('rnd_portal:access'), '연구소 포털 접속');
assert.equal(getPermissionLabel('roles:assign'), '직급/권한 부여 및 회수');
assert.ok(getPermissionLabel('unknown_key') === 'unknown_key');

const plantGroups = getPermissionCatalogGroupsForMatrix([
  'meal_survey',
  'volunteer_activity',
  'office_supply_request',
  'booking',
  'seat_room',
]);
const plantKeys = plantGroups.flatMap((g) => g.items.map((i) => i.key));
assert.ok(plantKeys.includes('meal_survey:manage'));
assert.ok(plantKeys.includes('office_supply_request:manage'));
assert.ok(plantKeys.includes('roles:assign'));

const academyGroups = getPermissionCatalogGroupsForMatrix(['attendance', 'booking', 'passes']);
const academyKeys = academyGroups.flatMap((g) => g.items.map((i) => i.key));
assert.ok(!academyKeys.includes('meal_survey:manage'));
assert.ok(!academyKeys.includes('volunteer:manage'));
assert.ok(!academyKeys.includes('office_supply_request:manage'));
assert.ok(academyKeys.includes('roles:assign'));
assert.ok(academyKeys.includes('attendance'));
// 재무 키는 사업주 전용 — 직급 매트릭스에 노출하지 않음
assert.ok(!academyKeys.includes('billing_invoices'));
assert.ok(!academyKeys.includes('statistics'));

const allMatrixKeys = getPermissionCatalogGroupsForMatrix(null).flatMap((g) =>
  g.items.map((i) => i.key)
);
assert.ok(!allMatrixKeys.includes('billing_invoices'));
assert.ok(!allMatrixKeys.includes('statistics'));

console.log('permissionCatalog.test.ts: ok');
