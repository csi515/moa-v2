/**
 * 역할 판정 순수 헬퍼 (UI 플러그인·supabase 비의존).
 * getAllowedTabs 등 UX 가드는 여기 결과를 사용한다.
 */
import type { UserRole } from '@/types';

/** owner/admin/manager — 사업장 운영 전체 */
export function isOrgAdmin(role: UserRole | string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

export function isOrgOwner(role: UserRole | string | null | undefined): boolean {
  return role === 'owner';
}

export function isStaffRole(role: UserRole | string | null | undefined): boolean {
  return role === 'staff' || role === 'instructor';
}

export function isParentRole(role: UserRole | string | null | undefined): boolean {
  return role === 'parent' || role === 'guardian';
}

/**
 * UX 탭 권한 등급.
 * customer/member/null/unknown → none (admin 폴백 금지)
 */
export type RoleAccessKind = 'admin' | 'staff' | 'parent' | 'none';

export function resolveRoleAccessKind(
  role: UserRole | string | null | undefined
): RoleAccessKind {
  if (isOrgAdmin(role)) return 'admin';
  if (isStaffRole(role)) return 'staff';
  if (isParentRole(role)) return 'parent';
  return 'none';
}
