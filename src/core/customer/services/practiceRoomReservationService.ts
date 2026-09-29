/**
 * Piano 연습실 예약 facade.
 * 겹침 규칙·RPC는 @/core/resources Capability를 재사용한다.
 */
import { resourceReservationCapability } from '@/core/resources';
import { PRACTICE_ROOM_RESOURCE_KIND } from '@/core/resources';
import type { PracticeRoomRow, RoomReservationRow } from '@/core/resources';

export type { PracticeRoomRow, RoomReservationRow };
export type { ResourceReservationStatus as RoomReservationStatus } from '@/core/resources';
export { seoulDateFromIso, seoulTimeFromIso, toSeoulIso } from '@/core/resources';

export const practiceRoomReservationService = {
  listRooms(organizationId: string) {
    return resourceReservationCapability.listPracticeRooms(organizationId);
  },

  upsertRoom(params: {
    organizationId: string;
    name: string;
    capacity?: number;
    openTime?: string;
    closeTime?: string;
    id?: string;
  }) {
    return resourceReservationCapability.upsertResource({
      ...params,
      kind: PRACTICE_ROOM_RESOURCE_KIND,
    });
  },

  listMyReservations(organizationId: string) {
    return resourceReservationCapability.listMyReservations(organizationId);
  },

  listForCustomer(
    organizationId: string,
    customerId: string,
    options?: { fromDate?: string; limit?: number }
  ) {
    return resourceReservationCapability.listForCustomer(organizationId, customerId, options);
  },

  listByDate(organizationId: string, date: string) {
    return resourceReservationCapability.listByDate(organizationId, date);
  },

  listByRange(organizationId: string, startDate: string, endDate: string) {
    return resourceReservationCapability.listByRange(organizationId, startDate, endDate);
  },

  listPending(organizationId: string) {
    return resourceReservationCapability.listPending(organizationId);
  },

  request(params: {
    organizationId: string;
    roomId: string;
    startsAt: string;
    endsAt: string;
    memo?: string;
  }) {
    return resourceReservationCapability.request({
      organizationId: params.organizationId,
      resourceId: params.roomId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      memo: params.memo,
    });
  },

  createStaff(params: {
    organizationId: string;
    roomId: string;
    customerId: string;
    startsAt: string;
    endsAt: string;
    memo?: string;
  }) {
    return resourceReservationCapability.createStaff({
      organizationId: params.organizationId,
      resourceId: params.roomId,
      customerId: params.customerId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      memo: params.memo,
    });
  },

  cancel(reservationId: string) {
    return resourceReservationCapability.cancel(reservationId);
  },

  review(reservationId: string, approve: boolean, memo?: string) {
    return resourceReservationCapability.review(reservationId, approve, memo);
  },
};
