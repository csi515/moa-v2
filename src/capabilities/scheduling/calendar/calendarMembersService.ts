import { isSupabaseConfigured } from '@/lib/supabase';
import { getCoreClient } from '@/lib/supabase/client';

export interface CalendarStaffMember {
  userId: string;
  name: string;
  role: string;
  color: string;
}

/**
 * 직원별 고유 컬러 팔레트 (CI 가드레일 indigo/purple 제외, 고대비 시맨틱 컬러)
 */
export const STAFF_COLOR_PALETTE = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#059669', // emerald-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#2563eb', // blue-600
  '#be123c', // rose-700
  '#0f766e', // teal-700
] as const;

export function getStaffColor(index: number): string {
  return STAFF_COLOR_PALETTE[Math.abs(index) % STAFF_COLOR_PALETTE.length];
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '대표',
  admin: '관리자',
  manager: '매니저',
  staff: '직원',
};

export async function listCalendarStaffMembers(
  organizationId: string
): Promise<CalendarStaffMember[]> {
  if (!organizationId || !isSupabaseConfigured()) return [];
  const client = getCoreClient();

  const joined = await client
    .from('organization_members')
    .select('user_id, role, profiles!organization_members_user_id_fkey(full_name)')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (!joined.error && joined.data) {
    return (joined.data as unknown as Array<Record<string, unknown>>).map((row, idx) => {
      const profile = firstRow(
        row.profiles as { full_name: string | null } | { full_name: string | null }[] | null
      );
      const role = String(row.role ?? 'staff');
      return {
        userId: String(row.user_id),
        name: profile?.full_name?.trim() || ROLE_LABELS[role] || role,
        role: ROLE_LABELS[role] || role,
        color: getStaffColor(idx),
      };
    });
  }

  const fallback = await client
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (fallback.error || !fallback.data) return [];
  return fallback.data.map((row, idx) => {
    const role = String(row.role ?? 'staff');
    return {
      userId: String(row.user_id),
      name: ROLE_LABELS[role] || role,
      role: ROLE_LABELS[role] || role,
      color: getStaffColor(idx),
    };
  });
}
