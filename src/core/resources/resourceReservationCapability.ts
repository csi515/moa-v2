/**
 * 업종 무관 자원 예약 Capability.
 * Resource 카탈로그는 resourceCapability. 겹침은 기존 EXCLUDE/RPC.
 */
import { resourceCapability } from './resourceCapability';
import {
  cancelResourceReservation,
  createStaffResourceReservation,
  listReservationsByDate,
  listReservationsByRange,
  listResourceReservationRows,
  listResourceReservations,
  requestResourceReservation,
  reviewResourceReservation,
  toResourceReservation,
  toRoomReservationRow,
} from './reservationService';
import { RESOURCE_RESERVATION_BLOCKING_STATUSES } from './types';
import { dayRangeSeoul } from './seoulTime';

export const resourceReservationCapability = {
  listResources: resourceCapability.listBookable,
  upsertResource: resourceCapability.upsert,
  listReservations: listResourceReservations,
  request: requestResourceReservation,
  createStaff: createStaffResourceReservation,
  cancel: cancelResourceReservation,
  review: reviewResourceReservation,
  toPracticeRoomRow: resourceCapability.toPracticeRoom,
  toRoomReservationRow,
  toResourceReservation,
  blockingStatuses: RESOURCE_RESERVATION_BLOCKING_STATUSES,
  listPracticeRooms: resourceCapability.listPracticeRooms,
  listByDate: listReservationsByDate,
  listByRange: listReservationsByRange,
  capacitySnapshot: resourceCapability.capacitySnapshot,
  async listMyReservations(organizationId: string) {
    const rows = await listResourceReservationRows({
      organizationId,
      order: 'desc',
      limit: 50,
    });
    return rows.map(toRoomReservationRow);
  },
  async listForCustomer(
    organizationId: string,
    customerId: string,
    options?: { fromDate?: string; limit?: number }
  ) {
    const from = options?.fromDate || new Date().toISOString().slice(0, 10);
    const { start } = dayRangeSeoul(from);
    const rows = await listResourceReservationRows({
      organizationId,
      customerId,
      status: [...RESOURCE_RESERVATION_BLOCKING_STATUSES],
      fromIso: start,
      order: 'asc',
      limit: options?.limit ?? 20,
    });
    return rows.map(toRoomReservationRow);
  },
  async listPending(organizationId: string) {
    const rows = await listResourceReservationRows({
      organizationId,
      status: 'pending',
      order: 'asc',
    });
    return rows.map(toRoomReservationRow);
  },
} as const;

export type ResourceReservationCapability = typeof resourceReservationCapability;
