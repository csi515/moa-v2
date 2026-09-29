/**
 * 기존 화면용 호환 레이어.
 * is_org_admin / is_org_staff_actor 의미를 바꾸지 않는다.
 */
import {
  isOrgAdmin,
  isOrgOwner,
  isParentRole,
  isStaffRole,
  resolveRoleAccessKind,
} from '@/core/auth/permissionsRole';
import { isOrgAdminRole, isOrgStaffActorRole, isStaffLikeRole } from './roleDefaults';

export {
  isOrgAdmin,
  isOrgOwner,
  isParentRole,
  isStaffRole,
  resolveRoleAccessKind,
};

/** 기존 isOrgAdmin과 동일. 화면 분기를 바꾸지 않는다. */
export function compatIsOrgAdmin(role: string | null | undefined): boolean {
  return isOrgAdmin(role);
}

/** 기존 core.is_org_staff_actor와 동일. owner/admin/manager/staff/instructor. */
export function compatIsOrgStaffActor(role: string | null | undefined): boolean {
  return isOrgAdmin(role) || isStaffRole(role);
}

/** 레지스트리 role 집합이 기존 helper와 어긋나지 않는지 확인용 */
export function compatibilityRoleContractsHold(): boolean {
  const samples = [
    'owner',
    'admin',
    'manager',
    'staff',
    'instructor',
    'parent',
    'guardian',
    'member',
    'customer',
    'unknown',
    null,
    undefined,
  ];
  return samples.every((role) => {
    const adminOk = compatIsOrgAdmin(role) === isOrgAdmin(role) && isOrgAdmin(role) === isOrgAdminRole(role);
    const staffOk = isStaffRole(role) === isStaffLikeRole(role);
    const actorOk = compatIsOrgStaffActor(role) === isOrgStaffActorRole(role);
    return adminOk && staffOk && actorOk;
  });
}
