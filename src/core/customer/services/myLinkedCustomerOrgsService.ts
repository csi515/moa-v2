import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';

/** 현재 User가 customers.user_id로 연결된 사업장 한 건 */
export type MyLinkedCustomerOrg = {
  customerId: string;
  customerName: string;
  /** core.customers.status — 거래 합산·임의 생성 없음 */
  customerStatus: string;
  organizationId: string;
  organizationName: string;
  industryType: string;
};

type LinkedCustomerRow = {
  id: string;
  name: string;
  status: string | null;
  organization_id: string;
  organizations:
    | {
        id: string;
        name: string;
        industry_type: string;
      }
    | {
        id: string;
        name: string;
        industry_type: string;
      }[]
    | null;
};

function unwrapOrg(
  organizations: LinkedCustomerRow['organizations']
): { id: string; name: string; industry_type: string } | null {
  if (!organizations) return null;
  if (Array.isArray(organizations)) return organizations[0] ?? null;
  return organizations;
}

/**
 * 본인 Customer(user_id = auth.uid())로 연결된 사업장 목록.
 * - 고객을 생성·전화 연결하지 않음 (조회만)
 * - organization은 is_org_member RLS로 멤버십이 있는 경우만 join
 */
export async function listMyLinkedCustomerOrganizations(): Promise<
  MyLinkedCustomerOrg[]
> {
  if (!isSupabaseConfigured()) return [];

  const client = getCoreClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) return [];

  const { data, error } = await client
    .from('customers')
    .select(
      `
      id,
      name,
      status,
      organization_id,
      organizations!inner (
        id,
        name,
        industry_type
      )
    `
    )
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: MyLinkedCustomerOrg[] = [];
  for (const row of (data as LinkedCustomerRow[] | null) ?? []) {
    const org = unwrapOrg(row.organizations);
    if (!org) continue;
    rows.push({
      customerId: row.id,
      customerName: row.name,
      customerStatus: (row.status || 'active').trim() || 'active',
      organizationId: org.id,
      organizationName: org.name,
      industryType: org.industry_type,
    });
  }

  return rows;
}

/** 고객 상태 표시용 */
export function getCustomerStatusLabel(status: string): {
  label: string;
  className: string;
} {
  const key = status.trim().toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    active: { label: '이용중', className: 'bg-emerald-100 text-emerald-800' },
    leave: { label: '휴면', className: 'bg-amber-100 text-amber-800' },
    withdrawn: { label: '종료', className: 'bg-slate-100 text-slate-600' },
    inactive: { label: '비활성', className: 'bg-slate-100 text-slate-600' },
  };
  return map[key] ?? { label: status || '알 수 없음', className: 'bg-slate-100 text-slate-600' };
}
