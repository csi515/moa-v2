import type { MemberRole } from '@/lib/supabase';

export function switchErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }
  const raw = error instanceof Error ? error.message : '';
  if (/failed to fetch|network|offline|load failed/i.test(raw)) {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }
  return raw || '사업장/역할 전환에 실패했습니다.';
}

export function roleSectionLabel(role: MemberRole): string {
  if (role === 'owner' || role === 'admin' || role === 'manager') return '사업장 관리';
  if (role === 'staff' || role === 'instructor') return '강사 활동';
  if (role === 'member' || role === 'customer') return '내가 다니는 곳';
  if (role === 'parent' || role === 'guardian') return '학부모 포털';
  return '역할';
}

export function isManagerLikeRole(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

export function isStaffLikeRole(role: MemberRole): boolean {
  return role === 'staff' || role === 'instructor';
}
