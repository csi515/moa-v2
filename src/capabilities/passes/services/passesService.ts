/**
 * Passes Service — DB 접근 및 원자적 업무 처리 서비스
 *
 * 책임:
 * - passes / customers 테이블 접근은 이 파일에서만 수행한다.
 * - UI 컴포넌트는 이 함수를 호출하되 getCoreClient()를 직접 사용하지 않는다.
 * - 테넌트 격리: 모든 조회·변경에 tenantId를 명시적으로 적용한다.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId } from '@/services/adapters';
import { getResourceLockErrorMessage } from '@/core/resource_locks/resourceLockErrors';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';
import type { PassType, PassStatus } from '../domain/passesEngine';

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface PassRecord {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  pass_name: string;
  pass_type: PassType;
  total_count: number;
  remaining_count: number;
  status: PassStatus;
  is_active: boolean;
  start_date: string;
  expires_at: string;
  created_at: string;
}

export interface IssuePassInput {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  passName: string;
  passType: PassType;
  totalCount: number;
  validityDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 데모 목업 (Supabase 미설정 환경)
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_PASSES: PassRecord[] = [
  {
    id: 'pass-demo-1',
    tenant_id: 'demo',
    customer_id: 'c1',
    customer_name: '김민준',
    customer_phone: '010-1234-5678',
    pass_name: '필라테스 10회권',
    pass_type: 'COUNT_BASED',
    total_count: 10,
    remaining_count: 8,
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-10-01',
    expires_at: '2026-12-31',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pass-demo-2',
    tenant_id: 'demo',
    customer_id: 'c2',
    customer_name: '이서연',
    customer_phone: '010-9876-5432',
    pass_name: '골프 레슨 20회권',
    pass_type: 'COUNT_BASED',
    total_count: 20,
    remaining_count: 1,
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-08-01',
    expires_at: '2026-11-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pass-demo-3',
    tenant_id: 'demo',
    customer_id: 'c3',
    customer_name: '박지호',
    customer_phone: '010-5555-4321',
    pass_name: '스터디카페 30일권',
    pass_type: 'PERIOD_BASED',
    total_count: 30,
    remaining_count: 15,
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-10-01',
    expires_at: '2026-10-31',
    created_at: new Date().toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 서비스 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 테넌트의 이용권 목록을 조회한다.
 * DataProvider를 경유하지 않는 직접 쿼리이므로, 호출 측에서 AbortSignal을 전달해
 * 언마운트 시 취소할 수 있다.
 */
export async function fetchPasses(
  tenantId: string,
  signal?: AbortSignal
): Promise<PassRecord[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_PASSES;
  }

  const client = getCoreClient();
  const query = (client as any)
    .from('passes')
    .select(
      `id, tenant_id, customer_id, pass_name, pass_type, total_count,
       remaining_count, status, is_active, start_date, expires_at, created_at,
       customer:customers(name, phone)`
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  // AbortSignal 지원 (언마운트 시 요청 취소)
  if (signal) {
    query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p: any): PassRecord => ({
    id: p.id,
    tenant_id: p.tenant_id,
    customer_id: p.customer_id,
    customer_name: p.customer?.name ?? '무명 회원',
    customer_phone: p.customer?.phone ?? '',
    pass_name: p.pass_name,
    pass_type: p.pass_type,
    total_count: p.total_count,
    remaining_count: p.remaining_count,
    status: p.status,
    is_active: p.is_active,
    start_date: p.start_date,
    expires_at: p.expires_at,
    created_at: p.created_at,
  }));
}

/**
 * 이용권을 원자적으로 1회 차감한다.
 * deduct_pass_atomic RPC — DB 트랜잭션 및 FOR UPDATE 행 잠금으로 처리되므로 중복/초과 차감이 방지된다.
 */
export async function deductPassAtomic(passId: string, tenantId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();
  const effectiveTenantId = tenantId || getOrganizationId();

  const rpcParams: Record<string, unknown> = {
    p_pass_id: passId,
  };
  if (effectiveTenantId) {
    rpcParams.p_tenant_id = effectiveTenantId;
    rpcParams.p_count = 1;
  }

  const { error } = await (client as any).rpc('deduct_pass_atomic', rpcParams);

  if (error) {
    throw new Error(getResourceLockErrorMessage(error));
  }

  // StorageService / TanStack Query 캐시 무효화 알림
  notifyStorageFromRefineResource('passes');
}

/**
 * 신규 이용권을 발급한다.
 * 1. 이름으로 고객을 조회하고 없으면 생성한다.
 * 2. passes 테이블에 이용권을 삽입한다.
 *
 * 주의: 고객 조회 → 생성 → 이용권 생성이 원자적이지 않으므로
 * 향후 단일 RPC로 통합하는 것이 권장된다. (현재는 레거시 스키마 제약)
 */
export async function issuePass(input: IssuePassInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();

  const startDate = new Date().toISOString().split('T')[0];
  const expiresAt = new Date(Date.now() + input.validityDays * 86_400_000)
    .toISOString()
    .split('T')[0];

  // 1. 고객 조회 또는 생성
  let customerId: string | null = null;
  const { data: existing } = await client
    .from('customers')
    .select('id')
    .eq('organization_id', input.tenantId)
    .eq('name', input.customerName.trim())
    .maybeSingle();

  if (existing) {
    customerId = existing.id;
  } else {
    const { data: created, error: createError } = await client
      .from('customers')
      .insert({
        organization_id: input.tenantId,
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        status: 'active',
      })
      .select('id')
      .single();

    if (createError) throw new Error(createError.message);
    customerId = created?.id ?? null;
  }

  // 2. 이용권 생성
  const { error: passError } = await (client as any).from('passes').insert({
    tenant_id: input.tenantId,
    customer_id: customerId,
    pass_name: input.passName.trim(),
    pass_type: input.passType,
    total_count: input.totalCount,
    remaining_count: input.totalCount,
    status: 'ACTIVE',
    is_active: true,
    start_date: startDate,
    expires_at: expiresAt,
  });

  if (passError) throw new Error(passError.message);

  // StorageService / TanStack Query 캐시 무효화 알림
  notifyStorageFromRefineResource('passes');
  notifyStorageFromRefineResource('customers');
}
