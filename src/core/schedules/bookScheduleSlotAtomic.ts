/**
 * 동시성 예약 행 잠금(FOR UPDATE) 원자적 클라이언트.
 * DB: core.book_schedule_slot / public.book_schedule_slot 가 Single Source of Truth.
 * 
 * 동시 다중 요청 시 타임슬롯 행 락(FOR UPDATE OF s)으로 직렬화하여
 * 잔여 1자리 동시 클릭 시 정원 초과(Overbooking)를 원천 차단함.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getOrganizationId, getStorageAdapter, STORAGE_KEYS } from '@/services/adapters';
import { StorageService } from '@/services/storage';
import type { Booking } from '@/core/types/schedule';
import { refreshAffectedPassMirror } from './bookingPassAtomic';
import { invalidateTenantQueries } from '@/core/query/tenantQueryKeys';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';
import { parseResourceLockError } from '@/core/resource_locks/resourceLockErrors';

export interface BookScheduleSlotParams {
  scheduleId: string;
  customerId: string;
  customerName?: string;
  passId?: string | null;
  /** 로컬 미러용 메타데이터 (옵션) */
  staffId?: string;
  staffName?: string;
  serviceId?: string;
  serviceName?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface BookScheduleSlotResult {
  success: boolean;
  reservationId: string;
  scheduleId: string;
  customerId: string;
  passId?: string | null;
  bookedCount: number;
  maxCapacity: number;
  remainingCapacity: number;
  booking?: Booking;
}

export function parseBookingRpcError(error: { message?: string; details?: string; hint?: string } | null): Error {
  const msg = error?.message || error?.details || '';
  if (msg.includes('NO_REMAINING_PASS_UNITS') || msg.includes('잔여 수강권')) {
    return new Error('잔여 수강권 횟수가 부족합니다.');
  }
  if (msg.includes('CAPACITY_EXCEEDED_WAITLIST')) {
    return new Error('예약 정원이 마감되었습니다. 대기 접수를 이용해 주세요.');
  }
  if (msg.includes('CAPACITY_EXCEEDED')) {
    return new Error('예약 정원이 모두 마감되었습니다.');
  }
  const parsed = parseResourceLockError(error);
  if (parsed.code !== 'UNKNOWN') {
    return new Error(parsed.message);
  }
  if (msg.includes('SCHEDULE_NOT_FOUND')) {
    return new Error('존재하지 않거나 삭제된 일정입니다.');
  }
  if (msg.includes('CUSTOMER_NOT_FOUND')) {
    return new Error('회원 정보를 찾을 수 없습니다.');
  }
  return new Error(msg || '예약 처리에 실패했습니다.');
}

/**
 * 타임슬롯 동시성 방어 원자적 예약 처리
 */
export async function bookScheduleSlotAtomic(
  params: BookScheduleSlotParams
): Promise<BookScheduleSlotResult> {
  const { scheduleId, customerId, passId } = params;
  const orgId = getOrganizationId();
  const useRpc = Boolean(isSupabaseConfigured() && orgId);

  // 1. 온라인 환경: DB Row Lock RPC 호출
  if (useRpc) {
    const client = getCoreClient();
    const { data, error } = await client.rpc('book_schedule_slot' as never, {
      p_tenant_id: orgId,
      p_schedule_id: scheduleId,
      p_customer_id: customerId,
      p_pass_id: passId || null,
    } as never);

    if (error) {
      throw parseBookingRpcError(error);
    }

    const payload = data as {
      success: boolean;
      reservation_id: string;
      schedule_id: string;
      customer_id: string;
      pass_id?: string | null;
      booked_count: number;
      max_capacity: number;
      remaining_capacity: number;
    };

    // 로컬 미러 갱신 (사용권 차감 반영)
    if (payload.pass_id && orgId) {
      void refreshAffectedPassMirror(orgId, [payload.pass_id]);
    }

    // 로컬 스토리지 예약 미러 동기화
    let createdBooking: Booking | undefined;
    try {
      const adapter = getStorageAdapter();
      const list = adapter.getItem<Booking[]>(STORAGE_KEYS.SCHEDULES, []);
      createdBooking = {
        id: payload.reservation_id,
        customerId: payload.customer_id,
        customerName: params.customerName || '회원',
        staffId: params.staffId,
        staffName: params.staffName,
        serviceId: params.serviceId,
        serviceName: params.serviceName,
        startsAt: params.startsAt || new Date().toISOString(),
        endsAt: params.endsAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        sessionPassId: payload.pass_id ?? undefined,
        createdAt: new Date().toISOString(),
      };
      const nextList = [...list.filter((b) => b.id !== createdBooking!.id), createdBooking];
      if (adapter.writeLocalMirror) {
        adapter.writeLocalMirror(STORAGE_KEYS.SCHEDULES, nextList);
      }
    } catch {
      /* mirror best-effort */
    }

    if (orgId) {
      invalidateTenantQueries('schedules', orgId);
    }
    notifyStorageFromRefineResource('schedules');

    return {
      success: true,
      reservationId: payload.reservation_id,
      scheduleId: payload.schedule_id,
      customerId: payload.customer_id,
      passId: payload.pass_id,
      bookedCount: payload.booked_count,
      maxCapacity: payload.max_capacity,
      remainingCapacity: payload.remaining_capacity,
      booking: createdBooking,
    };
  }

  // 2. 데모/오프라인 환경 Fallback
  const bookings = StorageService.getBookings();
  const existingForSlot = bookings.filter(
    (b) => (b as unknown as { scheduleId?: string }).scheduleId === scheduleId || (params.startsAt && b.startsAt === params.startsAt)
  );

  const fallbackBooking: Booking = StorageService.saveBooking({
    customerId,
    customerName: params.customerName || '회원',
    staffId: params.staffId,
    staffName: params.staffName,
    serviceId: params.serviceId,
    serviceName: params.serviceName,
    startsAt: params.startsAt || new Date().toISOString(),
    endsAt: params.endsAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    sessionPassId: passId ?? undefined,
  });

  if (orgId) {
    invalidateTenantQueries('schedules', orgId);
  }
  notifyStorageFromRefineResource('schedules');

  return {
    success: true,
    reservationId: fallbackBooking.id,
    scheduleId,
    customerId,
    passId,
    bookedCount: existingForSlot.length + 1,
    maxCapacity: 10,
    remainingCapacity: Math.max(0, 10 - (existingForSlot.length + 1)),
    booking: fallbackBooking,
  };
}
