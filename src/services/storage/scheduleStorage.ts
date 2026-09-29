import type { Booking, BookingStatus, ServiceOffering } from '../../core/types/schedule';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem } from './helpers';
import { markPendingDelete, markPendingUpsert } from '../adapters/pendingMutations';
import {
  deleteRemoteSchedule,
  upsertRemoteSchedule,
} from '../adapters/sync/scheduleRowMutations';

/**
 * 예약·서비스(필라테스 등) persistence CRUD.
 * 이용권 연동 상태 전이는 ScheduleService.updateBookingStatus 사용
 * (이 레이어의 updateBookingStatus는 status 필드만 갱신 — 차감/복구 없음).
 */
export function createScheduleStorage() {
  return {
    getBookings(): Booking[] {
      return getItem<Booking[]>(STORAGE_KEYS.SCHEDULES, []);
    },

    saveBooking(booking: Omit<Booking, 'id'> & { id?: string }): Booking {
      const list = this.getBookings();
      let saved: Booking;

      if (booking.id) {
        const idx = list.findIndex((entry) => entry.id === booking.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...booking, id: booking.id };
          list[idx] = saved;
        } else {
          saved = { ...booking, id: booking.id };
          list.unshift(saved);
        }
      } else {
        saved = { ...booking, id: generateEntityId('bk') };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.SCHEDULES, list);
      markPendingUpsert(STORAGE_KEYS.SCHEDULES, saved.id);
      void upsertRemoteSchedule(saved).then((ok) => {
        if (!ok) markPendingUpsert(STORAGE_KEYS.SCHEDULES, saved.id);
      });
      return saved;
    },

    /**
     * legacy/local-only: status 필드만 저장. 이용권 규칙·RLS 없음.
     * production 상태 전이는 ScheduleService.updateBookingStatus / cancelBookingAsParent.
     */
    updateBookingStatus(id: string, status: BookingStatus): Booking | null {
      const list = this.getBookings();
      const idx = list.findIndex((entry) => entry.id === id);
      if (idx === -1) return null;
      const updated = { ...list[idx], status };
      list[idx] = updated;
      setItem(STORAGE_KEYS.SCHEDULES, list);
      return updated;
    },

    deleteBooking(id: string): boolean {
      const list = this.getBookings();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.SCHEDULES, list);
      markPendingDelete(STORAGE_KEYS.SCHEDULES, id);
      void deleteRemoteSchedule(id);
      return true;
    },

    getServiceOfferings(): ServiceOffering[] {
      return getItem<ServiceOffering[]>(STORAGE_KEYS.SERVICE_OFFERINGS, []);
    },

    saveServiceOffering(offering: Omit<ServiceOffering, 'id'> & { id?: string }): ServiceOffering {
      const list = this.getServiceOfferings();
      let saved: ServiceOffering;

      if (offering.id) {
        const idx = list.findIndex((entry) => entry.id === offering.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...offering, id: offering.id };
          list[idx] = saved;
        } else {
          saved = { ...offering, id: offering.id };
          list.unshift(saved);
        }
      } else {
        saved = { ...offering, id: generateEntityId('svc') };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.SERVICE_OFFERINGS, list);
      return saved;
    },

    deleteServiceOffering(id: string): boolean {
      const list = this.getServiceOfferings();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.SERVICE_OFFERINGS, list);
      return true;
    },
  };
}
