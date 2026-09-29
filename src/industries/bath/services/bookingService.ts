/**
 * Bath 예약. 겹침 확정은 DB RPC. 가용성 조회는 참고용.
 */
import { RESOURCE_RESERVATION_BLOCKING_STATUSES } from '@/core/resources/types';
import { resourceReservationCapability } from '@/core/resources';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getBathClient } from '@/lib/supabase/bathClient';
import { getOrganizationId } from '@/services/adapters';
import type { BathBooking, BathAvailabilityQuery, BathBookingCreateInput, BathBookingListQuery, BathBookingStatus } from '../types/booking';
import { STAFF_RESOURCE_KIND } from '../types/booking';
import { mapBathBookingRpcError } from './bookingErrors';
import { rowToBathBooking, type BathBookingRow } from './bookingMappers';
import { getBathBookingById, listBathBookings } from './bookingRepository';
import { getBathRoomById } from './roomRepository';
import { getBathServiceById } from './offeredServiceRepository';
import {
  bathBookingValidationMessage,
  isResourceSlotFree,
  resolveBookingEndsAt,
  validateBathBookingInput,
} from './bookingValidation';

function requireOrgId(): string {
  if (!isSupabaseConfigured()) {
    throw new Error('온라인 환경에서만 예약을 처리할 수 있습니다.');
  }
  const orgId = getOrganizationId();
  if (!orgId) throw new Error('사업장이 선택되지 않았습니다.');
  return orgId;
}

async function callBookingRpc(
  name: 'create_booking' | 'cancel_booking' | 'set_booking_status',
  args: Record<string, unknown>
): Promise<BathBooking> {
  const client = getBathClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapBathBookingRpcError(error).message);
  if (!data) throw new Error('예약 처리에 실패했습니다.');
  return rowToBathBooking(data as BathBookingRow);
}

async function resolveCreateInput(organizationId: string, input: BathBookingCreateInput) {
  let resourceId = input.resourceId;
  if (input.roomId) {
    const room = await getBathRoomById(organizationId, input.roomId);
    if (!room || !room.active) throw new Error('예약할 수 없는 객실입니다.');
    resourceId = room.resourceId;
  }
  const service = input.serviceId
    ? await getBathServiceById(organizationId, input.serviceId)
    : undefined;
  if (input.serviceId && !service) throw new Error('예약할 수 없는 서비스입니다.');
  const endsAt = resolveBookingEndsAt(input, service?.durationMinutes);
  const decision = validateBathBookingInput(
    { ...input, resourceId },
    { endsAt, service }
  );
  if (decision.ok === false) {
    throw new Error(bathBookingValidationMessage(decision.reason));
  }
  return { resourceId: resourceId as string, endsAt, service };
}

export const bathBookingService = {
  list(query: BathBookingListQuery = {}) {
    return listBathBookings(requireOrgId(), query);
  },

  getById(bookingId: string) {
    return getBathBookingById(requireOrgId(), bookingId);
  },

  async checkAvailability(query: BathAvailabilityQuery): Promise<{ available: boolean }> {
    const organizationId = requireOrgId();
    const occupied = await resourceReservationCapability.listReservations({
      organizationId,
      resourceId: query.resourceId,
      status: [...RESOURCE_RESERVATION_BLOCKING_STATUSES],
    });
    let available = isResourceSlotFree(occupied, query.resourceId, query.startsAt, query.endsAt);
    if (!available || !query.staffId) return { available };

    const staffResources = await resourceReservationCapability.listResources({
      organizationId,
      kind: STAFF_RESOURCE_KIND,
    });
    const staffResource = staffResources.find((row) => row.name === `${STAFF_RESOURCE_KIND}:${query.staffId}`);
    if (!staffResource) return { available: true };

    const staffOccupied = await resourceReservationCapability.listReservations({
      organizationId,
      resourceId: staffResource.id,
      status: [...RESOURCE_RESERVATION_BLOCKING_STATUSES],
    });
    return {
      available: isResourceSlotFree(staffOccupied, staffResource.id, query.startsAt, query.endsAt),
    };
  },

  async create(input: BathBookingCreateInput): Promise<BathBooking> {
    const organizationId = requireOrgId();
    const resolved = await resolveCreateInput(organizationId, input);
    return callBookingRpc('create_booking', {
      p_organization_id: organizationId,
      p_customer_id: input.customerId,
      p_resource_id: resolved.resourceId,
      p_starts_at: input.startsAt,
      p_ends_at: resolved.endsAt,
      p_service_id: input.serviceId ?? null,
      p_staff_id: input.staffId ?? null,
      p_room_id: input.roomId ?? null,
      p_memo: input.memo ?? null,
      p_idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
    });
  },

  cancel(bookingId: string): Promise<BathBooking> {
    return callBookingRpc('cancel_booking', {
      p_organization_id: requireOrgId(),
      p_booking_id: bookingId,
    });
  },

  setStatus(bookingId: string, status: BathBookingStatus): Promise<BathBooking> {
    return callBookingRpc('set_booking_status', {
      p_organization_id: requireOrgId(),
      p_booking_id: bookingId,
      p_status: status,
    });
  },
};
