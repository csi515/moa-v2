import { scopeAllowsResource, type DepartmentScopeType } from '@/core/organizations/departmentScope';

/** 사업주 및 위임 관리자가 설정한 직급 권한(JSONB boolean) 판정 및 RBAC 위임 관리 로직. */

export const ROLE_PERMISSION_KEYS = [
  'billing_invoices',
  'attendance',
  'booking',
  'passes',
  'statistics',
  'members_manage',
  'members:manage',
  'roles:assign',
  'seat_room',
  'rental_equipment',
  'policies',
  'resources_manage',
  'resources:manage',
  'grievances_manage',
  'feedbacks:read_all',
  'ownership:transfer',
  'shuttle:manage',
  'volunteer:manage',
  'meal_survey:manage',
  'office_supply_request:manage',
  'rnd_portal:access',
] as const;

export type RolePermissionKey = (typeof ROLE_PERMISSION_KEYS)[number];

export type RolePermissionMap = Record<RolePermissionKey, boolean>;

export const EMPTY_ROLE_PERMISSIONS: RolePermissionMap = {
  billing_invoices: false,
  attendance: true,
  booking: true,
  passes: true,
  statistics: false,
  members_manage: false,
  'members:manage': false,
  'roles:assign': false,
  seat_room: false,
  rental_equipment: false,
  policies: false,
  resources_manage: false,
  'resources:manage': false,
  grievances_manage: false,
  'feedbacks:read_all': false,
  'ownership:transfer': false,
  'shuttle:manage': false,
  'volunteer:manage': false,
  'meal_survey:manage': false,
  'office_supply_request:manage': false,
  'rnd_portal:access': false,
};

/** 기업 총무팀 기본 직급 템플릿 (Pre-fill 규격) */
export const GENERAL_AFFAIRS_ROLE_TEMPLATE = {
  name: '총무/시설 관리자',
  description: '기업 총무팀 위임 관리자 (좌석/예약/대여 및 직원 직급·권한 위임 관리)',
  permissions: {
    'members:manage': true,
    'roles:assign': true,
    seat_room: true,
    booking: true,
    rental_equipment: true,
    billing_invoices: false,
    attendance: true,
    passes: true,
    policies: false,
    statistics: false,
    resources_manage: true,
    grievances_manage: false,
    'shuttle:manage': true,
    'volunteer:manage': true,
    'meal_survey:manage': true,
    'office_supply_request:manage': true,
    'rnd_portal:access': false,
  },
} as const;

export type AccessMember = {
  id?: string;
  role?: string | null;
  permissions?: RolePermissionMap | Record<string, boolean> | string[] | null;
  customRole?: { permissions?: RolePermissionMap | Record<string, boolean> | string[] | null } | null;
};

/** 누락 키는 false(또는 EMPTY 기본값)로 채운다. 구버전 및 신규 네임스페이스 호환. */
export function normalizeRolePermissions(value: unknown): RolePermissionMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const hasAnyKnown = ROLE_PERMISSION_KEYS.some((key) => typeof obj[key] === 'boolean');
  if (!hasAnyKnown) return null;
  const next = { ...EMPTY_ROLE_PERMISSIONS };
  for (const key of ROLE_PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') next[key] = obj[key] as boolean;
  }

  // members:manage <-> members_manage 호환성 동기화
  if (typeof obj['members:manage'] === 'boolean') {
    next['members:manage'] = obj['members:manage'] as boolean;
    if (typeof obj['members_manage'] !== 'boolean') next.members_manage = obj['members:manage'] as boolean;
  } else if (typeof obj['members_manage'] === 'boolean') {
    next.members_manage = obj['members_manage'] as boolean;
    next['members:manage'] = obj['members_manage'] as boolean;
  }

  // roles:assign <-> roles_assign 호환성 동기화
  if (typeof obj['roles:assign'] === 'boolean') {
    next['roles:assign'] = obj['roles:assign'] as boolean;
  } else if (typeof obj['roles_assign'] === 'boolean') {
    next['roles:assign'] = obj['roles_assign'] as boolean;
  }

  if (typeof obj['resources:manage'] === 'boolean') {
    next['resources:manage'] = obj['resources:manage'] as boolean;
    if (typeof obj.resources_manage !== 'boolean') next.resources_manage = obj['resources:manage'] as boolean;
  } else if (typeof obj.resources_manage === 'boolean') {
    next.resources_manage = obj.resources_manage as boolean;
    next['resources:manage'] = obj.resources_manage as boolean;
  }

  if (typeof obj['feedbacks:read_all'] === 'boolean') {
    next['feedbacks:read_all'] = obj['feedbacks:read_all'] as boolean;
    if (typeof obj.grievances_manage !== 'boolean') next.grievances_manage = obj['feedbacks:read_all'] as boolean;
  } else if (typeof obj.grievances_manage === 'boolean') {
    next.grievances_manage = obj.grievances_manage as boolean;
    next['feedbacks:read_all'] = obj.grievances_manage as boolean;
  }

  return next;
}

export function isRolePermissionMap(value: unknown): value is RolePermissionMap {
  return normalizeRolePermissions(value) !== null;
}

/**
 * 호출자의 보유 권한 전체를 key-value 맵으로 반환 (권한 상승 방어 및 검증용)
 */
export function getCallerEffectivePermissions(caller: AccessMember): Record<string, boolean> {
  if (caller.role === 'owner') {
    return Object.fromEntries(ROLE_PERMISSION_KEYS.map((k) => [k, true]));
  }
  const result: Record<string, boolean> = {};

  const direct = caller.permissions;
  if (direct) {
    if (Array.isArray(direct)) {
      for (const k of direct) result[k] = true;
    } else if (typeof direct === 'object') {
      for (const [k, v] of Object.entries(direct)) {
        if (v === true) result[k] = true;
      }
    }
  }

  const custom = caller.customRole?.permissions;
  if (custom) {
    if (Array.isArray(custom)) {
      for (const k of custom) result[k] = true;
    } else if (typeof custom === 'object') {
      for (const [k, v] of Object.entries(custom)) {
        if (v === true) result[k] = true;
      }
    }
  }

  // members:manage <-> members_manage 동기화
  if (result['members:manage']) result['members_manage'] = true;
  if (result['members_manage']) result['members:manage'] = true;
  if (result['roles:assign']) result['roles_assign'] = true;
  if (result['roles_assign']) result['roles:assign'] = true;

  return result;
}

/**
 * 타 직원의 직급/권한을 부여하거나 회수할 수 있는 위임 관리자 또는 사업주인지 판정.
 * 1. role === 'owner' -> true
 * 2. permissions['roles:assign'] === true 또는 customRole.permissions['roles:assign'] === true -> true
 * 3. 그 외 일반 직원 -> false
 */
export function canManageRoles(callerMember?: AccessMember | { role?: string | null; permissions?: any; customRole?: any } | null): boolean {
  if (!callerMember) return false;
  if (callerMember.role === 'owner') return true;

  // Direct permissions check
  const direct = callerMember.permissions;
  if (direct) {
    if (Array.isArray(direct)) {
      if (direct.includes('roles:assign') || direct.includes('roles_assign') || direct.includes('roles:manage')) return true;
    } else if (typeof direct === 'object') {
      const rec = direct as Record<string, unknown>;
      if (rec['roles:assign'] === true || rec.roles_assign === true || rec['roles:manage'] === true) return true;
    }
  }

  // customRole permissions check
  const customRolePerms = callerMember.customRole?.permissions;
  if (customRolePerms) {
    if (Array.isArray(customRolePerms)) {
      if (customRolePerms.includes('roles:assign') || customRolePerms.includes('roles_assign')) return true;
    } else if (typeof customRolePerms === 'object') {
      const rec = customRolePerms as Record<string, unknown>;
      if (rec['roles:assign'] === true || rec.roles_assign === true) return true;
    }
  }

  return false;
}

/**
 * 직급 부여/회수 권한 검증 및 권한 상승(Privilege Escalation) 방어 순수 검증 로직.
 * - 호출자가 owner이거나 'roles:assign' 권한을 보유하지 않으면 거절 (예외 발생)
 * - 대상이 owner인 경우 수정/회수 시도 시 예외 발생
 * - 비-owner 위임 관리자가 자신이 보유하지 않은 권한을 타인에게 부여하려 할 때 예외 발생 (권한 상승 방지)
 */
export function assertCanAssignOrRevokeRole(
  callerMember: AccessMember,
  targetMember: AccessMember,
  newRolePermissions?: Record<string, boolean> | null
): void {
  if (!canManageRoles(callerMember)) {
    throw new Error('권한이 없습니다: 직급을 부여하거나 회수할 권한이 부여되지 않았습니다.');
  }

  if (targetMember.role === 'owner') {
    throw new Error('대표 사업자의 권한은 수정하거나 회수할 수 없습니다.');
  }

  // 권한 상승(Privilege Escalation) 방어: 위임 관리자는 본인이 보유하지 않은 권한이 포함된 직급을 타인에게 부여할 수 없음
  if (callerMember.role !== 'owner' && newRolePermissions) {
    const callerPerms = getCallerEffectivePermissions(callerMember);
    for (const [key, val] of Object.entries(newRolePermissions)) {
      if (val === true && !callerPerms[key]) {
        throw new Error(`권한 상승 방지: 본인이 보유하지 않은 권한(${key})을 포함한 직급은 부여할 수 없습니다.`);
      }
    }
  }
}

export function canAssignOrRevokeRole(
  callerMember: AccessMember,
  targetMember: AccessMember,
  newRolePermissions?: Record<string, boolean> | null
): boolean {
  try {
    assertCanAssignOrRevokeRole(callerMember, targetMember, newRolePermissions);
    return true;
  } catch {
    return false;
  }
}

/**
 * 타 직원의 직급을 배정/회수할 수 있는지 종합 판정:
 * 1. 대상 직원이 대표 사업자(owner)인 경우 절대 불가 (false)
 * 2. 호출자가 대표 사업자(owner)인 경우 대상이 owner가 아니면 허용 (true)
 * 3. 호출자가 'roles:assign' 권한을 보유한 총무/운영 위임 관리자이고 대상이 owner가 아니면 허용 (true)
 * 4. 그 외 일반 직원 -> false
 */
export function canManageMemberRoles(
  callerMember?: AccessMember | null,
  targetMember?: AccessMember | null
): boolean {
  if (!callerMember || !targetMember) return false;
  if (targetMember.role === 'owner') return false;
  if (callerMember.role === 'owner') return true;
  return canManageRoles(callerMember);
}

/**
 * 대표 사업자(CEO/Owner) 또는 위임받은 인사팀의 소유권 이전 권한 판정:
 * 1. role === 'owner' -> true
 * 2. permissions['ownership:transfer'] === true 또는 customRole.permissions['ownership:transfer'] === true -> true
 * 3. 그 외 일반 직원 -> false
 */
export function canTransferOwnership(
  callerMember?: AccessMember | { role?: string | null; permissions?: any; customRole?: any } | null
): boolean {
  if (!callerMember) return false;
  if (callerMember.role === 'owner') return true;

  // Direct permissions check
  const direct = callerMember.permissions;
  if (direct) {
    if (Array.isArray(direct)) {
      if (direct.includes('ownership:transfer') || direct.includes('ownership_transfer')) return true;
    } else if (typeof direct === 'object') {
      const rec = direct as Record<string, unknown>;
      if (rec['ownership:transfer'] === true || rec.ownership_transfer === true) return true;
    }
  }

  // customRole permissions check
  const customRolePerms = callerMember.customRole?.permissions;
  if (customRolePerms) {
    if (Array.isArray(customRolePerms)) {
      if (customRolePerms.includes('ownership:transfer') || customRolePerms.includes('ownership_transfer')) return true;
    } else if (typeof customRolePerms === 'object') {
      const rec = customRolePerms as Record<string, unknown>;
      if (rec['ownership:transfer'] === true || rec.ownership_transfer === true) return true;
    }
  }

  return false;
}

/**
 * 소유권 이전 실행 전 불변조건 및 권한 검증
 */
export function assertCanTransferOwnership(
  callerMember: AccessMember,
  targetMember: AccessMember
): void {
  if (!canTransferOwnership(callerMember)) {
    throw new Error('권한이 없습니다: 대표 사업자(owner) 또는 대표이사 변경 권한(ownership:transfer)을 위임받은 관리자만 소유권을 이전할 수 있습니다.');
  }
  if (targetMember.role === 'owner') {
    throw new Error('대상 직원은 이미 대표 사업자입니다.');
  }
}


export function evaluateMemberAccess(
  member: AccessMember,
  targetResource: string,
  action: string
): boolean {
  if (member.role === 'owner' || member.role === 'director') return true;

  // 재무·수납·매출 통계는 사업주 전용 — 직급 매트릭스 플래그로 위임 불가
  if (targetResource === 'billing_invoices' || targetResource === 'statistics') {
    return false;
  }

  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags) {
    return flags[targetResource as RolePermissionKey] === true;
  }

  if (targetResource === 'attendance') return true;
  if (
    (targetResource === 'booking' || targetResource === 'passes') &&
    (action === 'list' || action === 'read' || action === 'show')
  ) {
    return true;
  }
  return false;
}

const NAV_RESOURCE: Record<string, RolePermissionKey> = {
  billing: 'billing_invoices',
  schedules: 'booking',
  bookings: 'booking',
  passes: 'passes',
  attendance: 'attendance',
  settings: 'policies',
  fleet: 'booking',
  grievances: 'grievances_manage',
};

export function canManageResourceCatalog(member: AccessMember): boolean {
  if (member.role === 'owner') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (!flags) return false;
  return flags.resources_manage || flags['resources:manage'];
}

/** 사내 통근 셔틀 노선·정류장·명부 관리 위임 권한 */
export function canManageShuttleRoutes(member: AccessMember): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags?.['shuttle:manage']) return true;
  const effective = getCallerEffectivePermissions(member);
  return (
    effective['shuttle:manage'] === true ||
    effective['shuttle:routes:manage'] === true ||
    effective['shuttle:dispatch:operate'] === true
  );
}

/** 사내 봉사활동 게시·모집 관리 위임 권한 */
export function canManageVolunteer(member: AccessMember): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags?.['volunteer:manage']) return true;
  const effective = getCallerEffectivePermissions(member);
  return effective['volunteer:manage'] === true;
}

/** 사내 식수인원 조사 설정·전체 현황 위임 권한 */
export function canManageMealSurvey(member: AccessMember): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags?.['meal_survey:manage']) return true;
  const effective = getCallerEffectivePermissions(member);
  return effective['meal_survey:manage'] === true;
}

/** 사무용품 월별 취합 카탈로그·캠페인·취합 위임 권한 */
export function canManageOfficeSupplyRequest(member: AccessMember): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags?.['office_supply_request:manage']) return true;
  const effective = getCallerEffectivePermissions(member);
  return effective['office_supply_request:manage'] === true;
}

/** 연구소 통합 포털 진입 (과제 조회 view 와 분리) */
export function canAccessRndPortal(member: AccessMember): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (flags?.['rnd_portal:access']) return true;
  const effective = getCallerEffectivePermissions(member);
  return effective['rnd_portal:access'] === true;
}

export function canReadAllFeedbacks(member: AccessMember): boolean {
  if (member.role === 'owner') return true;
  const flags = normalizeRolePermissions(member.customRole?.permissions ?? null);
  if (!flags) return false;
  return flags.grievances_manage || flags['feedbacks:read_all'];
}

export function isNavTabAllowed(tab: string, member: AccessMember): boolean {
  if (tab === 'grievances') {
    // 직원도 본인 건의 탭은 열 수 있음. 전체 함은 화면 내부에서 분기.
    return true;
  }
  const resource = NAV_RESOURCE[tab];
  if (!resource) return true;
  return evaluateMemberAccess(member, resource, 'read');
}

/**
 * 부서 스코프(Department Scope) 격리 순수 필터링 함수
 * 1. 사용자의 소속 부서(memberDepartmentId)가 없거나(null/undefined/공백) 전사 권한인 경우: 전체 항목 반환
 * 2. 사용자의 소속 부서가 특정 부서로 지정된 경우: 해당 부서에 속한 데이터 또는 부서 미지정(공용) 데이터만 반환
 */
export type PermissionEvaluationContext = {
  scopeType?: DepartmentScopeType;
  memberDepartmentId?: string | null;
  memberPath?: string | null;
  resourceDepartmentId?: string | null;
  resourcePath?: string | null;
};

/**
 * 직급 JSONB + 부서 스코프를 함께 평가한다. resource는 RolePermissionKey 또는 NAV 리소스 키.
 */
export function evaluatePermission(
  member: AccessMember,
  resource: string,
  action: string,
  context?: PermissionEvaluationContext,
): boolean {
  const navKey = NAV_RESOURCE[resource];
  const permissionKey = (navKey ?? resource) as RolePermissionKey;
  const allowed = evaluateMemberAccess(member, permissionKey, action);
  if (!allowed) return false;

  const resourceDept = context?.resourceDepartmentId?.trim() || null;
  if (!resourceDept) return true;

  const scope = context?.scopeType ?? 'SELF_ONLY';
  const memberDept = context?.memberDepartmentId?.trim() || null;

  return scopeAllowsResource({
    scopeType: scope,
    memberDepartmentId: memberDept,
    memberPath: context?.memberPath?.trim() || null,
    resourceDepartmentId: resourceDept,
    resourcePath: context?.resourcePath?.trim() || null,
  });
}

export function filterByDepartmentScope<T extends { department_id?: string | null }>(
  items: T[],
  memberDepartmentId?: string | null
): T[] {
  if (!items || !Array.isArray(items)) return [];
  const deptId = memberDepartmentId?.trim();
  if (!deptId) return items;

  return items.filter((item) => {
    const itemDeptId = item.department_id?.trim();
    return !itemDeptId || itemDeptId === deptId;
  });
}

