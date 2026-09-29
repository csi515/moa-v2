import { isBlockingReservationStatus, resourceRangesOverlap } from '@/core/resources/overlap';
import type { ResourceReservation } from '@/core/resources/types';
import type { BathService } from '../types/service';
import type { BathBookingCreateInput } from '../types/booking';

export type BathBookingValidationError =
  | 'customer'
  | 'time_range'
  | 'resource'
  | 'staff'
  | 'service_inactive'
  | 'service_resource'
  | 'service_staff';

export function resolveBookingEndsAt(input: BathBookingCreateInput, durationMinutes?: number): string {
  if (input.endsAt) return input.endsAt;
  if (!durationMinutes) return input.startsAt;
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return input.startsAt;
  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
}

export function validateBathBookingInput(
  input: BathBookingCreateInput,
  options: {
    endsAt: string;
    service?: Pick<BathService, 'active' | 'requiresResource' | 'requiresStaff' | 'resourceIds' | 'staffIds'>;
  }
): { ok: true } | { ok: false; reason: BathBookingValidationError } {
  if (!input.customerId.trim()) return { ok: false, reason: 'customer' };
  if (!input.startsAt || !options.endsAt || options.endsAt <= input.startsAt) {
    return { ok: false, reason: 'time_range' };
  }
  const resourceId = input.resourceId;
  if (!resourceId) return { ok: false, reason: 'resource' };

  const service = options.service;
  if (service) {
    if (!service.active) return { ok: false, reason: 'service_inactive' };
    if (service.requiresResource && service.resourceIds.length > 0) {
      if (!service.resourceIds.includes(resourceId)) return { ok: false, reason: 'service_resource' };
    }
    if (service.requiresStaff && !input.staffId) return { ok: false, reason: 'staff' };
    if (service.requiresStaff && service.staffIds.length > 0 && input.staffId) {
      if (!service.staffIds.includes(input.staffId)) return { ok: false, reason: 'service_staff' };
    }
  }
  return { ok: true };
}

export function bathBookingValidationMessage(reason: BathBookingValidationError): string {
  if (reason === 'customer') return '고객을 선택하세요.';
  if (reason === 'time_range') return '시작·종료 시간이 올바르지 않습니다.';
  if (reason === 'resource') return '예약할 자원을 선택하세요.';
  if (reason === 'staff') return '담당 직원이 필요합니다.';
  if (reason === 'service_inactive') return '비활성 서비스는 예약할 수 없습니다.';
  if (reason === 'service_resource') return '이 서비스에 연결되지 않은 자원입니다.';
  return '이 서비스에 연결되지 않은 직원입니다.';
}

/** 사전 조회용. 확정은 RPC가 한다. */
export function isResourceSlotFree(
  occupied: Array<Pick<ResourceReservation, 'resourceId' | 'starts_at' | 'ends_at' | 'status'>>,
  resourceId: string,
  startsAt: string,
  endsAt: string
): boolean {
  return !occupied.some(
    (row) =>
      isBlockingReservationStatus(row.status) &&
      row.resourceId === resourceId &&
      resourceRangesOverlap(row.starts_at, row.ends_at, startsAt, endsAt)
  );
}
