import type { Booking } from '@/core/types/schedule';
import type { IncomeEntry } from '@/core/finance/types';
import {
  findIncomeByPaymentSource,
  upsertLinkedIncome,
} from '@/core/finance/billingIncomeLink';
import { ScheduleService } from '@/core/services/scheduleService';
import { StorageService } from '@/services/storage';

/** 예약금 입금 확인 → 예약 상태 + 재무 수입 연결 (중복 방지) */
export function confirmBookingDeposit(booking: Booking): {
  booking: Booking;
  income: IncomeEntry | null;
  createdIncome: boolean;
} {
  const settings = StorageService.getSettings();
  const amount = Math.max(0, Number(settings.depositAmount || 0));

  const updated = ScheduleService.saveBooking({
    ...booking,
    depositStatus: 'confirmed',
  });

  if (amount <= 0) {
    return { booking: updated, income: null, createdIncome: false };
  }

  const existed = Boolean(findIncomeByPaymentSource('booking', booking.id));
  const income = upsertLinkedIncome({
    sourceType: 'booking',
    paymentId: booking.id,
    date: (booking.startsAt || new Date().toISOString()).slice(0, 10),
    amount,
    paymentMethod: 'transfer',
    description: `예약금 · ${booking.customerName}${
      booking.serviceName ? ` · ${booking.serviceName}` : ''
    }`,
    payer: booking.customerName,
    memo: `booking:${booking.id}`,
  });

  return { booking: updated, income, createdIncome: !existed };
}
