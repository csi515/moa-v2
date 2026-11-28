/**
 * 부서 스코프 × stock_locations 필터 계약
 * 실행: node --import tsx src/capabilities/commerce/stock/stockLocationScope.test.ts
 */
import assert from 'node:assert/strict';
import { stockLocationService, type StockLocation } from './stockLocationService';

const locs: StockLocation[] = [
  {
    id: 'loc-central',
    organizationId: 'org-1',
    name: '중앙 창고',
    code: 'central',
    departmentId: null,
    isActive: true,
    configured: false,
  },
  {
    id: 'loc-a',
    organizationId: 'org-1',
    name: '생산A',
    code: 'dept_a',
    departmentId: 'dept-a',
    isActive: true,
    configured: false,
  },
  {
    id: 'loc-b',
    organizationId: 'org-1',
    name: '생산B',
    code: 'dept_b',
    departmentId: 'dept-b',
    isActive: true,
    configured: false,
  },
];

const pathById = new Map([
  ['dept-a', '/dept-a/'],
  ['dept-b', '/dept-b/'],
]);

{
  const scoped = stockLocationService.filterByMemberScope(locs, {
    scopeType: 'GLOBAL',
    memberDepartmentId: 'dept-a',
    memberPath: '/dept-a/',
    departmentPathById: pathById,
  });
  assert.equal(scoped.length, 3);
}

{
  const scoped = stockLocationService.filterByMemberScope(locs, {
    scopeType: 'SELF_ONLY',
    memberDepartmentId: 'dept-a',
    memberPath: '/dept-a/',
    departmentPathById: pathById,
  });
  assert.equal(scoped.length, 2);
  assert.ok(scoped.some((l) => l.code === 'central'));
  assert.ok(scoped.some((l) => l.id === 'loc-a'));
  assert.ok(!scoped.some((l) => l.id === 'loc-b'));
}

{
  const scoped = stockLocationService.filterByMemberScope(locs, {
    scopeType: 'DESCENDANTS',
    memberDepartmentId: 'dept-a',
    memberPath: '/dept-a/',
    departmentPathById: pathById,
  });
  assert.ok(scoped.some((l) => l.code === 'central'));
  assert.ok(scoped.some((l) => l.id === 'loc-a'));
  assert.ok(!scoped.some((l) => l.id === 'loc-b'));
}

console.log('stockLocationScope.test.ts: ok');
