import type { BookingStatus } from '@/core/types/schedule';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  scheduled: '예약됨',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
  no_show: '노쇼',
};
