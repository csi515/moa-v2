import type { Booking, BookingStatus } from '@/core/types/schedule';

export function bookingChangeNotice(
  booking: Booking,
  status: BookingStatus,
  serviceFallback: string
): { title: string; message: string } | null {
  const name = booking.serviceName || serviceFallback;
  const when = booking.startsAt.slice(0, 16).replace('T', ' ');
  if (status === 'confirmed') {
    return { title: '예약 확정', message: `${name} 예약이 ${when}에 확정되었습니다.` };
  }
  if (status === 'cancelled') {
    return { title: '예약 취소', message: `${name} 예약이 취소되었습니다.` };
  }
  if (status === 'completed') {
    return { title: '수업 완료', message: `${name} 참석이 완료되었습니다.` };
  }
  if (status === 'no_show') {
    return { title: '노쇼', message: `${name}이 노쇼로 처리되었습니다.` };
  }
  return null;
}
