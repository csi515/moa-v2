import assert from 'node:assert/strict';
import {
  EMPTY_ROLE_PERMISSIONS,
  GENERAL_AFFAIRS_ROLE_TEMPLATE,
  assertCanAssignOrRevokeRole,
  canAssignOrRevokeRole,
  canManageRoles,
  canManageMemberRoles,
  canTransferOwnership,
  assertCanTransferOwnership,
  filterByDepartmentScope,
  evaluateMemberAccess,
  canManageResourceCatalog,
  canReadAllFeedbacks,
  evaluatePermission,
  normalizeRolePermissions,
  type AccessMember,
  type RolePermissionMap,
} from './permissions';

// -----------------------------------------------------------------------------
// 기존 불변조건 회귀 검증
// -----------------------------------------------------------------------------
const financeOn: RolePermissionMap = {
  ...EMPTY_ROLE_PERMISSIONS,
  billing_invoices: true,
  attendance: true,
  booking: false,
  passes: false,
  statistics: true,
};

const financeOff: RolePermissionMap = { ...financeOn, billing_invoices: false, statistics: false };

assert.equal(
  evaluateMemberAccess({ role: 'owner', customRole: { permissions: financeOff } }, 'billing_invoices', 'read'),
  true
);

// 재무 키는 매트릭스에 켜져 있어도 사업주 전용 — staff 거부
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOn } }, 'billing_invoices', 'read'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOff } }, 'billing_invoices', 'read'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOn } }, 'statistics', 'list'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: financeOff } }, 'statistics', 'list'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'director', customRole: { permissions: financeOff } }, 'billing_invoices', 'read'),
  true
);

assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'attendance', 'write'), true);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'billing_invoices', 'read'), false);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'booking', 'read'), true);
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: null }, 'booking', 'write'), false);

const legacy = normalizeRolePermissions({
  billing_invoices: false,
  attendance: true,
  booking: true,
  passes: true,
  statistics: false,
  members_manage: false,
  policies: false,
});
assert.ok(legacy);
assert.equal(legacy.resources_manage, false);
assert.equal(legacy.grievances_manage, false);

const ga: RolePermissionMap = { ...EMPTY_ROLE_PERMISSIONS, resources_manage: true, booking: true };
assert.equal(evaluateMemberAccess({ role: 'staff', customRole: { permissions: ga } }, 'resources_manage', 'write'), true);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: EMPTY_ROLE_PERMISSIONS } }, 'resources_manage', 'write'),
  false
);
assert.equal(
  evaluateMemberAccess({ role: 'staff', customRole: { permissions: { ...EMPTY_ROLE_PERMISSIONS, grievances_manage: true } } }, 'grievances_manage', 'read'),
  true
);

// -----------------------------------------------------------------------------
// [기업 총무팀 위임 관리자 RBAC & 세션 파기 불변조건 테스트]
// -----------------------------------------------------------------------------

const ownerUser: AccessMember = {
  id: 'usr_owner_01',
  role: 'owner',
};

const gaManager: AccessMember = {
  id: 'usr_ga_01',
  role: 'staff',
  permissions: {
    'members:manage': true,
    'roles:assign': true,
    seat_room: true,
    booking: true,
    rental_equipment: true,
    billing_invoices: false,
  },
  customRole: {
    permissions: GENERAL_AFFAIRS_ROLE_TEMPLATE.permissions,
  },
};

const regularStaff: AccessMember = {
  id: 'usr_staff_01',
  role: 'staff',
  permissions: {
    attendance: true,
    booking: true,
  },
  customRole: null,
};

const instructorUser: AccessMember = {
  id: 'usr_instructor_01',
  role: 'instructor',
  permissions: ['attendance'],
  customRole: null,
};

const hrManagerWithTransfer: AccessMember = {
  id: 'usr_hr_01',
  role: 'staff',
  permissions: {
    'members:manage': true,
    'roles:assign': true,
    'ownership:transfer': true,
  },
  customRole: {
    permissions: {
      ...GENERAL_AFFAIRS_ROLE_TEMPLATE.permissions,
      'ownership:transfer': true,
    },
  },
};


// [케이스 1] 대표 사업자(owner)는 모든 직원의 직급을 부여/회수할 수 있어야 함.
assert.equal(canManageRoles(ownerUser), true, '사업자는 canManageRoles 참이어야 함');
assert.equal(canManageMemberRoles(ownerUser, regularStaff), true, '사업자는 일반 직원의 직급을 관리할 수 있어야 함');
assert.doesNotThrow(
  () => assertCanAssignOrRevokeRole(ownerUser, regularStaff, { billing_invoices: true }),
  '사업자는 직급 부여 가능'
);
assert.doesNotThrow(
  () => assertCanAssignOrRevokeRole(ownerUser, regularStaff, null),
  '사업자는 직급 회수 가능'
);
assert.equal(canAssignOrRevokeRole(ownerUser, regularStaff), true);

// [케이스 2] roles:assign 권한을 가진 총무팀 관리자는 일반 직원에게 직급을 배정/회수할 수 있어야 함.
assert.equal(canManageRoles(gaManager), true, '총무팀 관리자는 canManageRoles 참이어야 함');
assert.equal(canManageMemberRoles(gaManager, regularStaff), true, '총무팀 관리자는 일반 직원의 직급을 관리할 수 있어야 함');
assert.doesNotThrow(
  () => assertCanAssignOrRevokeRole(gaManager, regularStaff, { seat_room: true, booking: true }),
  '총무팀 관리자는 보유 권한 내 직급 배정 가능'
);
assert.doesNotThrow(
  () => assertCanAssignOrRevokeRole(gaManager, regularStaff, null),
  '총무팀 관리자는 직급 회수(기본 사원으로 강등) 가능'
);
assert.equal(canAssignOrRevokeRole(gaManager, regularStaff, { seat_room: true }), true);

// [케이스 3] 총무팀 관리자라 하더라도 owner 직급을 회수하려 하면 차단(Exception/false)되어야 함.
assert.equal(canManageMemberRoles(gaManager, ownerUser), false, '총무팀 관리자의 owner 직급 변경은 false여야 함');
assert.equal(canManageMemberRoles(ownerUser, ownerUser), false, 'owner 자신도 owner 직급 수정 대상 불가');
assert.throws(
  () => assertCanAssignOrRevokeRole(gaManager, ownerUser, null),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('대표 사업자의 권한은 수정하거나 회수할 수 없습니다.');
  },
  '총무팀 관리자가 사업자 권한을 회수하려 할 때 42501 예외 차단 필수'
);
assert.throws(
  () => assertCanAssignOrRevokeRole(gaManager, ownerUser, { booking: true }),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('대표 사업자의 권한은 수정하거나 회수할 수 없습니다.');
  },
  '총무팀 관리자가 사업자 권한을 수정하려 할 때 42501 예외 차단 필수'
);
assert.equal(canAssignOrRevokeRole(gaManager, ownerUser), false);

// [케이스 4] roles:assign 권한이 없는 일반 직원(강사, 알바, 일반 사원)의 권한 변경 시도는 즉시 거절되어야 함.
assert.equal(canManageRoles(regularStaff), false, '일반 직원은 canManageRoles 거짓이어야 함');
assert.equal(canManageRoles(instructorUser), false, '강사는 canManageRoles 거짓이어야 함');
assert.equal(canManageRoles(null), false, '익명/null은 canManageRoles 거짓이어야 함');
assert.equal(canManageMemberRoles(regularStaff, instructorUser), false, '일반 직원의 타 직원 권한 관리는 false');
assert.equal(canManageMemberRoles(instructorUser, regularStaff), false, '강사의 타 직원 권한 관리는 false');

assert.throws(
  () => assertCanAssignOrRevokeRole(regularStaff, instructorUser, null),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('권한이 없습니다: 직급을 부여하거나 회수할 권한이 부여되지 않았습니다.');
  },
  'roles:assign 없는 일반 직원의 권한 변경은 즉시 예외 거절'
);
assert.throws(
  () => assertCanAssignOrRevokeRole(instructorUser, regularStaff, null),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('권한이 없습니다: 직급을 부여하거나 회수할 권한이 부여되지 않았습니다.');
  },
  '강사의 직급 부여/회수 시도는 즉시 예외 거절'
);
assert.equal(canAssignOrRevokeRole(regularStaff, instructorUser), false);

// [권한 상승(Privilege Escalation) 원천 방어 검증]
assert.throws(
  () => assertCanAssignOrRevokeRole(gaManager, regularStaff, { billing_invoices: true }),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('권한 상승 방지: 본인이 보유하지 않은 권한(billing_invoices)을 포함한 직급은 부여할 수 없습니다.');
  },
  '총무팀 관리자의 미보유 권한 부여 시도 차단 필수'
);

// [케이스 5] 대표 사업자(owner) 및 ownership:transfer 권한을 위임받은 인사팀 관리자의 소유권 이전 검증
assert.equal(canTransferOwnership(ownerUser), true, '대표 사업자는 소유권 이전 권한 true');
assert.equal(canTransferOwnership(hrManagerWithTransfer), true, 'ownership:transfer 권한 보유 인사팀은 소유권 이전 권한 true');
assert.equal(canTransferOwnership(gaManager), false, 'ownership:transfer 없는 총무팀 관리자는 소유권 이전 권한 false');
assert.equal(canTransferOwnership(regularStaff), false, '일반 직원은 소유권 이전 권한 false');
assert.equal(canTransferOwnership(instructorUser), false, '강사는 소유권 이전 권한 false');
assert.equal(canTransferOwnership(null), false, 'null/미인증자는 소유권 이전 권한 false');

assert.doesNotThrow(
  () => assertCanTransferOwnership(ownerUser, regularStaff),
  '대표 사업자는 일반 직원에게 소유권 이전 검증 통과'
);
assert.doesNotThrow(
  () => assertCanTransferOwnership(hrManagerWithTransfer, regularStaff),
  'ownership:transfer 권한 보유 인사팀은 일반 직원에게 소유권 이전 대행 검증 통과'
);
assert.throws(
  () => assertCanTransferOwnership(gaManager, regularStaff),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('소유권을 이전할 수 있습니다');
  },
  '권한 없는 총무팀의 소유권 이전 시도는 예외 거절'
);
assert.throws(
  () => assertCanTransferOwnership(ownerUser, ownerUser),
  (err: unknown) => {
    assert.ok(err instanceof Error);
    return err.message.includes('대상 직원은 이미 대표 사업자입니다.');
  },
  '이미 대표 사업자인 대상에게 소유권 이전 시도는 예외 거절'
);


const gaWithResources: AccessMember = {
  role: 'staff',
  customRole: {
    permissions: { ...EMPTY_ROLE_PERMISSIONS, 'resources:manage': true },
  },
};
assert.equal(canManageResourceCatalog(gaWithResources), true, 'resources:manage alias enables catalog');
assert.equal(canManageResourceCatalog({ role: 'staff', customRole: { permissions: EMPTY_ROLE_PERMISSIONS } }), false);

const hrGrievance: AccessMember = {
  role: 'staff',
  customRole: { permissions: { ...EMPTY_ROLE_PERMISSIONS, 'feedbacks:read_all': true } },
};
assert.equal(canReadAllFeedbacks(hrGrievance), true, 'feedbacks:read_all alias enables inbox');
assert.equal(canReadAllFeedbacks({ role: 'owner' }), true);

const scopedMember: AccessMember = {
  role: 'staff',
  customRole: { permissions: { ...EMPTY_ROLE_PERMISSIONS, resources_manage: true } },
};
assert.equal(
  evaluatePermission(scopedMember, 'resources_manage', 'read', {
    scopeType: 'SELF_ONLY',
    memberDepartmentId: 'dept_a',
    resourceDepartmentId: 'dept_a',
  }),
  true,
);
assert.equal(
  evaluatePermission(scopedMember, 'resources_manage', 'read', {
    scopeType: 'SELF_ONLY',
    memberDepartmentId: 'dept_a',
    resourceDepartmentId: 'dept_b',
  }),
  false,
);
assert.equal(
  evaluatePermission(scopedMember, 'resources_manage', 'read', {
    scopeType: 'GLOBAL',
    memberDepartmentId: 'dept_a',
    resourceDepartmentId: 'dept_b',
  }),
  true,
);
assert.equal(
  evaluatePermission(scopedMember, 'resources_manage', 'read', {
    scopeType: 'DESCENDANTS',
    memberDepartmentId: 'hq',
    memberPath: '/hq/',
    resourceDepartmentId: 'line',
    resourcePath: '/hq/line/',
  }),
  true,
);
assert.equal(
  evaluatePermission(scopedMember, 'resources_manage', 'read', {
    scopeType: 'DESCENDANTS',
    memberDepartmentId: 'hq',
    memberPath: '/hq/',
    resourceDepartmentId: 'other',
    resourcePath: '/other/',
  }),
  false,
);

// [케이스 6] 부서 스코프(Department Scope) 격리 필터링 검증
const mockResources = [
  { id: 'res_common', name: '공용 회의실', department_id: null },
  { id: 'res_prod_01', name: '생산라인 A호기', department_id: 'dept_production' },
  { id: 'res_prod_02', name: '생산라인 B호기', department_id: 'dept_production' },
  { id: 'res_rnd_01', name: '클린룸 실험실', department_id: 'dept_rnd' },
];

// 1) 전사 관리자 또는 부서 미지정자(소상공인): 모든 자원(4건) 접근 가능
assert.equal(filterByDepartmentScope(mockResources, null).length, 4, '전사 직원은 전체 자원 조회 가능');
assert.equal(filterByDepartmentScope(mockResources, undefined).length, 4, '부서 미지정 직원은 전체 자원 조회 가능');
assert.equal(filterByDepartmentScope(mockResources, '').length, 4, '빈 문자열 부서 직원은 전체 자원 조회 가능');

// 2) 생산팀 소속 직원: 생산 자원(2건) + 공용 자원(1건) = 총 3건 접근 가능
const prodFiltered = filterByDepartmentScope(mockResources, 'dept_production');
assert.equal(prodFiltered.length, 3, '생산부서는 생산 자원 및 공용 자원만 조회 가능');
assert.ok(prodFiltered.every((r) => !r.department_id || r.department_id === 'dept_production'), '타 부서(R&D) 자원 노출 차단');

// 3) 연구소 소속 직원: R&D 자원(1건) + 공용 자원(1건) = 총 2건 접근 가능
const rndFiltered = filterByDepartmentScope(mockResources, 'dept_rnd');
assert.equal(rndFiltered.length, 2, 'R&D 부서는 연구소 자원 및 공용 자원만 조회 가능');
assert.ok(rndFiltered.some((r) => r.id === 'res_common'), '공용 자원은 항상 포함');
assert.ok(rndFiltered.some((r) => r.id === 'res_rnd_01'), '본인 부서 자원 포함');

// 4) 빈 배열 안전성 검증
assert.deepEqual(filterByDepartmentScope([], 'dept_production'), [], '빈 배열 입력 시 빈 배열 반환');

console.log('permissions.invariant.test.ts: ok');

