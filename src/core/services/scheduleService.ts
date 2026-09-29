import { StorageService } from '@/services/storage';
import type {
  Booking,
  BookingStatus,
  ServiceOffering,
  SessionPass,
  SlotRecruitment,
} from '../types/schedule';
import { getSlotCapacityInfo } from '@/core/schedules/bookingCapacity';
import {
  filterBookingsByDate,
  filterBookingsForSlotWindow,
  selectUpcomingBookings,
} from '@/core/schedules/bookingQuery';
import { sumRemainingSessions } from '@/core/schedules/sessionPassUtils';
import { sessionPassService } from '@/core/schedules/sessionPassService';
import { updateBookingStatusAtomic } from '@/core/schedules/bookingPassAtomic';
import { cancelBookingAsParent } from '@/core/schedules/parentBookingCancel';

/**
 * appointment Booking Domain Service (core.schedules 행).
 * bookable 슬롯 신청(core.reservations)이나 Piano 수업 출석이 아니다.
 * - 읽기: hydrate된 local cache 위에서 조건 필터 (UI는 sync API 유지)
 * - online/offline 차이는 Adapter hydrate가 담당 — 조회 API는 동일
 * - 상태 전이+차감/복구: updateBookingStatusAtomic
 *
 * 참고: 전체 schedules hydrate 후 filter는 학원 규모(수천 건)에서 허용.
 * getBookingsByDate / getUpcomingBookings 는 전체 sort·불필요 복사를 피한다.
 * 수년치 수만 건 이상이면 hydrate 윈도우(원격 조건부 select)를 다음 단계로 검토.
 */
export const ScheduleService = {
  getBookings(): Booking[] {
    return StorageService.getBookings();
  },

  getBookingsByDate(date: string): Booking[] {
    return filterBookingsByDate(StorageService.getBookings(), date);
  },

  getUpcomingBookings(limit = 10): Booking[] {
    return selectUpcomingBookings(StorageService.getBookings(), { limit });
  },

  saveBooking(booking: Omit<Booking, 'id'> & { id?: string }): Booking {
    return StorageService.saveBooking(booking);
  },

  /**
   * 예약 상태 변경 + 이용권 차감/복구 (원자).
   * 운영: core.update_booking_status_with_pass
   * 이용권 부족 시 null (예약 상태 미변경)
   */
  async updateBookingStatus(
    id: string,
    status: BookingStatus,
    options?: { consumeOnNoShow?: boolean }
  ): Promise<Booking | null> {
    return updateBookingStatusAtomic(id, status, options);
  },

  /**
   * 부모 포털 전용 예약 취소.
   * staff RPC를 열지 않고 core.cancel_booking_as_parent만 호출한다.
   */
  async cancelBookingAsParent(id: string): Promise<Booking | null> {
    return cancelBookingAsParent(id);
  },

  deleteBooking(id: string): boolean {
    return StorageService.deleteBooking(id);
  },

  getServiceOfferings(): ServiceOffering[] {
    return StorageService.getServiceOfferings();
  },

  getActiveServiceOfferings(): ServiceOffering[] {
    return StorageService.getServiceOfferings().filter((s) => s.isActive);
  },

  saveServiceOffering(offering: Omit<ServiceOffering, 'id'> & { id?: string }): ServiceOffering {
    return StorageService.saveServiceOffering(offering);
  },

  deleteServiceOffering(id: string): boolean {
    return StorageService.deleteServiceOffering(id);
  },

  getSessionPasses(): SessionPass[] {
    return sessionPassService.list();
  },

  getCustomerSessionPasses(customerId: string): SessionPass[] {
    return sessionPassService.listByCustomer(customerId);
  },

  getCustomerRemainingSessions(customerId: string): number {
    return sumRemainingSessions(sessionPassService.listByCustomer(customerId), customerId);
  },

  saveSessionPass(pass: Omit<SessionPass, 'id'> & { id?: string }): SessionPass {
    return sessionPassService.save(pass);
  },

  deleteSessionPass(id: string): boolean {
    return sessionPassService.delete(id);
  },

  getSlotRecruitments(): SlotRecruitment[] {
    return StorageService.getSlotRecruitments();
  },

  setSlotRecruitmentClosed(
    serviceId: string,
    staffId: string | null | undefined,
    startsAt: string,
    closedManually: boolean
  ) {
    return StorageService.setSlotRecruitmentClosed(serviceId, staffId, startsAt, closedManually);
  },

  setSlotRecruitmentCapacity(
    serviceId: string,
    staffId: string | null | undefined,
    startsAt: string,
    maxCapacity: number
  ) {
    return StorageService.setSlotRecruitmentCapacity(serviceId, staffId, startsAt, maxCapacity);
  },

  getSlotCapacity(serviceId: string, staffId: string | null | undefined, startsAt: string) {
    const service = this.getServiceOfferings().find((s) => s.id === serviceId);
    if (!service) return null;
    // 슬롯 시각·서비스만 넘겨 전체 예약 배열 스캔 비용 축소
    const bookings = filterBookingsForSlotWindow(this.getBookings(), startsAt, serviceId);
    return getSlotCapacityInfo({
      service,
      staffId,
      startsAt,
      bookings,
      recruitments: this.getSlotRecruitments(),
    });
  },
};
