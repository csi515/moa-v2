/**
 * 역할별 기본 permission.
 * is_org_admin / is_org_staff_actor 계약과 맞춘다.
 */
import { isKnownPermission, PERMISSION_KEYS } from './registry';
import type { Permission } from './types';

/** core.is_org_admin — owner/admin/manager */
export const ORG_ADMIN_ROLES = ['owner', 'admin', 'manager'] as const;

/** core.is_org_staff_actor — 현장 업무 역할 */
export const ORG_STAFF_ACTOR_ROLES = [
  'owner',
  'admin',
  'manager',
  'staff',
  'instructor',
] as const;

export const STAFF_LIKE_ROLES = ['staff', 'instructor'] as const;

/** 직원·강사 기본 권한. staff.manage / rooms.manage / finance.read 는 제외. */
export const STAFF_DEFAULT_PERMISSIONS: readonly Permission[] = [
  'customers.read',
  'customers.write',
  'sales.read',
  'sales.create',
  'sales.refund',
  'locations.read',
  'rooms.read',
  'staff.read',
  'reports.read',
];

const STAFF_DEFAULT_SET = new Set<string>(STAFF_DEFAULT_PERMISSIONS);

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

export function isStaffLikeRole(role: string | null | undefined): boolean {
  return role === 'staff' || role === 'instructor';
}

export function isOrgStaffActorRole(role: string | null | undefined): boolean {
  return isOrgAdminRole(role) || isStaffLikeRole(role);
}

export function roleHasDefaultPermission(
  role: string | null | undefined,
  permission: string
): boolean {
  if (!isKnownPermission(permission)) return false;
  if (isOrgAdminRole(role)) return true;
  if (isStaffLikeRole(role)) return STAFF_DEFAULT_SET.has(permission);
  return false;
}

export function defaultPermissionsForRole(role: string | null | undefined): readonly Permission[] {
  if (isOrgAdminRole(role)) return PERMISSION_KEYS;
  if (isStaffLikeRole(role)) return STAFF_DEFAULT_PERMISSIONS;
  return [];
}
