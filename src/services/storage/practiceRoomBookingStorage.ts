import type { PracticeRoomBooking } from '@/types';
import { getItem, setItem, upsertById, generateEntityId, type StorageApi } from './helpers';
import { STORAGE_KEYS } from '../adapters/storageKeys';

/**
 * @deprecated Phase 3A — 신규 쓰기는 practiceRoomReservationService(room_reservations)만 사용.
 * 읽기 폴백·레거시 sync용으로만 유지.
 */
export function createPracticeRoomBookingStorage(_api: StorageApi) {
  return {
    getPracticeRoomBookings(studentId?: string): PracticeRoomBooking[] {
      const list = getItem<PracticeRoomBooking[]>(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, []);
      if (!studentId) return list;
      return list.filter((b) => b.studentId === studentId);
    },

    savePracticeRoomBooking(
      booking: Omit<PracticeRoomBooking, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
    ): PracticeRoomBooking {
      const list = getItem<PracticeRoomBooking[]>(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, []);
      const saved = upsertById(list, booking, (id) => ({
        id: id || generateEntityId('prb'),
        studentId: booking.studentId,
        studentName: booking.studentName,
        room: booking.room,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        teacherId: booking.teacherId,
        teacherName: booking.teacherName,
        memo: booking.memo,
        createdBy: booking.createdBy,
        status: booking.status,
        createdAt: booking.createdAt || new Date().toISOString(),
      }));
      setItem(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, list);
      return saved;
    },

    cancelPracticeRoomBooking(id: string): void {
      const list = getItem<PracticeRoomBooking[]>(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, []);
      const next = list.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' as const } : b
      );
      setItem(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, next);
    },

    deletePracticeRoomBooking(id: string): void {
      const list = getItem<PracticeRoomBooking[]>(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, []);
      setItem(
        STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS,
        list.filter((b) => b.id !== id)
      );
    },
  };
}
