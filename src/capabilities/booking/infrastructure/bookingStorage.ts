import { createSessionPassStorage } from '@/services/storage/sessionPassStorage';

/** Booking persistence facade. 기존 session-pass factory를 연결한다. */
export function createBookingCapabilityStorage() {
  return createSessionPassStorage();
}

export type BookingCapabilityStorage = ReturnType<typeof createBookingCapabilityStorage>;

/** Booking persist SoT (이용권·슬롯). 예약 CRUD는 schedulingStorage. */
export const bookingStorage = createBookingCapabilityStorage();
