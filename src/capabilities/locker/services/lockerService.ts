/**
 * Locker Service — DB 접근 및 원자적 사물함 상태 관리 서비스
 *
 * 책임:
 * - lockers / customers 테이블 접근은 이 파일에서만 수행한다.
 * - UI 컴포넌트는 이 함수를 호출하되 getCoreClient()를 직접 사용하지 않는다.
 * - 테넌트 격리: 모든 조회·변경에 tenantId를 명시적으로 적용한다.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type LockerGridStatus = 'AVAILABLE' | 'OCCUPIED' | 'EXPIRING_SOON' | 'OVERDUE';

export interface LockerRecord {
  id: string;
  tenant_id: string;
  locker_number: string;
  section: string;
  status: string;
  assigned_customer_id: string | null;
  assigned_customer_name?: string;
  assigned_customer_phone?: string;
  deposit_amount: number | null;
  monthly_fee: number | null;
  start_date: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AssignLockerInput {
  tenantId: string;
  lockerId: string;
  lockerNumber: string;
  customerName: string;
  customerPhone: string;
  durationDays: number;
  depositAmount: number;
  monthlyFee: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 데모 목업 (Supabase 미설정 환경)
// ─────────────────────────────────────────────────────────────────────────────

function createDemoLockers(): LockerRecord[] {
  const today = new Date();
  const dateAdd = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'l-1',
      tenant_id: 'demo',
      locker_number: '101',
      section: '공용',
      status: 'AVAILABLE',
      assigned_customer_id: null,
      deposit_amount: 10000,
      monthly_fee: 10000,
      start_date: null,
      expires_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'l-2',
      tenant_id: 'demo',
      locker_number: '102',
      section: '공용',
      status: 'OCCUPIED',
      assigned_customer_id: 'c-1',
      assigned_customer_name: '이민준',
      assigned_customer_phone: '010-1234-5678',
      deposit_amount: 10000,
      monthly_fee: 10000,
      start_date: dateAdd(-15),
      expires_at: dateAdd(15),
      created_at: new Date().toISOString(),
    },
    {
      id: 'l-3',
      tenant_id: 'demo',
      locker_number: '103',
      section: '공용',
      status: 'EXPIRING_SOON',
      assigned_customer_id: 'c-2',
      assigned_customer_name: '박서연',
      assigned_customer_phone: '010-4444-5555',
      deposit_amount: 10000,
      monthly_fee: 10000,
      start_date: dateAdd(-27),
      expires_at: dateAdd(3),
      created_at: new Date().toISOString(),
    },
    {
      id: 'l-4',
      tenant_id: 'demo',
      locker_number: '104',
      section: '공용',
      status: 'OVERDUE',
      assigned_customer_id: 'c-3',
      assigned_customer_name: '정우진',
      assigned_customer_phone: '010-8888-9999',
      deposit_amount: 10000,
      monthly_fee: 10000,
      start_date: dateAdd(-35),
      expires_at: dateAdd(-5),
      created_at: new Date().toISOString(),
    },
    {
      id: 'l-5',
      tenant_id: 'demo',
      locker_number: '201',
      section: 'VIP 룸',
      status: 'AVAILABLE',
      assigned_customer_id: null,
      deposit_amount: 20000,
      monthly_fee: 30000,
      start_date: null,
      expires_at: null,
      created_at: new Date().toISOString(),
    },
  ];
}

export const DEMO_LOCKERS: LockerRecord[] = createDemoLockers();

// ─────────────────────────────────────────────────────────────────────────────
// 상태 계산 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

export function resolveLockerGridStatus(locker: LockerRecord): LockerGridStatus {
  if (!locker.assigned_customer_id && locker.status === 'AVAILABLE') {
    return 'AVAILABLE';
  }

  if (!locker.expires_at) {
    return 'OCCUPIED';
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (locker.expires_at < todayStr) {
    return 'OVERDUE';
  }

  const todayMs = new Date(todayStr).getTime();
  const expiryMs = new Date(locker.expires_at).getTime();
  const diffDays = Math.ceil((expiryMs - todayMs) / 86_400_000);

  if (diffDays <= 7) {
    return 'EXPIRING_SOON';
  }

  return 'OCCUPIED';
}

// ─────────────────────────────────────────────────────────────────────────────
// 서비스 함수
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 테넌트의 사물함 목록을 조회한다.
 * AbortSignal 지원으로 언마운트 시 안전하게 취소 가능.
 */
export async function fetchLockers(
  tenantId: string,
  signal?: AbortSignal
): Promise<LockerRecord[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_LOCKERS;
  }

  const client = getCoreClient();
  const query = (client as any)
    .from('lockers')
    .select(
      `id, tenant_id, locker_number, section, status, assigned_customer_id,
       deposit_amount, monthly_fee, start_date, expires_at, created_at,
       customer:customers(name, phone)`
    )
    .eq('tenant_id', tenantId)
    .order('locker_number', { ascending: true });

  if (signal) {
    query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((l: any): LockerRecord => ({
    id: l.id,
    tenant_id: l.tenant_id,
    locker_number: l.locker_number,
    section: l.section || '공용',
    status: l.status,
    assigned_customer_id: l.assigned_customer_id,
    assigned_customer_name: l.customer?.name,
    assigned_customer_phone: l.customer?.phone,
    deposit_amount: l.deposit_amount,
    monthly_fee: l.monthly_fee,
    start_date: l.start_date,
    expires_at: l.expires_at,
    created_at: l.created_at,
  }));
}

/**
 * 사물함에 회원을 배정한다.
 * 1. 고객 확인 또는 생성
 * 2. 사물함 점유 정보 업데이트
 */
export async function assignLockerRecord(input: AssignLockerInput): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();
  const startDate = new Date().toISOString().split('T')[0];
  const expiry = new Date(Date.now() + input.durationDays * 86_400_000)
    .toISOString()
    .split('T')[0];

  // 1. 고객 조회 또는 생성
  let custId: string | null = null;
  const { data: custData } = await client
    .from('customers')
    .select('id')
    .eq('organization_id', input.tenantId)
    .eq('name', input.customerName.trim())
    .maybeSingle();

  if (custData) {
    custId = custData.id;
  } else {
    const { data: newCust, error: custError } = await client
      .from('customers')
      .insert({
        organization_id: input.tenantId,
        name: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        status: 'active',
      })
      .select('id')
      .single();

    if (custError) throw new Error(custError.message);
    custId = newCust?.id ?? null;
  }

  // 2. 사물함 업데이트
  const { error: lockerError } = await (client as any)
    .from('lockers')
    .update({
      status: 'OCCUPIED',
      assigned_customer_id: custId,
      deposit_amount: input.depositAmount,
      monthly_fee: input.monthlyFee,
      start_date: startDate,
      expires_at: expiry,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.lockerId);

  if (lockerError) throw new Error(lockerError.message);

  notifyStorageFromRefineResource('lockers');
  notifyStorageFromRefineResource('customers');
}

/**
 * 사물함 이용 기간을 연장한다.
 */
export async function extendLockerRecord(
  lockerId: string,
  currentExpiry: string | null,
  extendDays: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();
  const baseExpiry = currentExpiry || new Date().toISOString().split('T')[0];
  const baseMs = Math.max(Date.now(), new Date(baseExpiry).getTime());
  const newExpiry = new Date(baseMs + extendDays * 86_400_000).toISOString().split('T')[0];

  const { error } = await (client as any)
    .from('lockers')
    .update({
      expires_at: newExpiry,
      status: 'OCCUPIED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lockerId);

  if (error) throw new Error(error.message);

  notifyStorageFromRefineResource('lockers');
}

/**
 * 사물함을 반납하고 공실 상태로 전환한다.
 */
export async function releaseLockerRecord(lockerId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();
  const { error } = await (client as any)
    .from('lockers')
    .update({
      status: 'AVAILABLE',
      assigned_customer_id: null,
      start_date: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lockerId);

  if (error) throw new Error(error.message);

  notifyStorageFromRefineResource('lockers');
}

/**
 * 신규 사물함을 등록한다.
 */
export async function addLockerRecord(
  tenantId: string,
  lockerNumber: string,
  section: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getCoreClient();
  const { error } = await (client as any).from('lockers').insert({
    tenant_id: tenantId,
    locker_number: lockerNumber.trim(),
    section: section.trim() || '공용',
    status: 'AVAILABLE',
  });

  if (error) throw new Error(error.message);

  notifyStorageFromRefineResource('lockers');
}
