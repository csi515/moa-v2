import type { StudentMonthlyBillingSummary } from '@/capabilities/billing/finance/billingLedgerTypes';

export type AttendanceBillingBadgeType = 'overdue' | 'due_today' | 'due_soon' | 'paid_clean';

export interface AttendanceBillingStudent {
  id: string;
  name: string;
  paymentDay?: number;
  tuitionFee?: number;
}

export interface AttendanceBillingBadgeInfo {
  type: AttendanceBillingBadgeType;
  label: string;
  tooltip: string;
  unpaidAmount: number;
  toneClass: string;
  isActionable: boolean;
}

/**
 * 280,000 -> "28만원", 350,000 -> "35만원" 등 간결한 통화 표기
 */
export function formatShortCurrency(amount: number): string {
  if (amount <= 0) return '0원';
  const man = Math.floor(amount / 10000);
  const remainder = amount % 10000;
  if (remainder === 0) {
    return `${man}만원`;
  }
  const formatted = (amount / 10000).toFixed(1);
  return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}만원`;
}

/**
 * 출결 목록에서 특정 학생의 결제일 및 미납 상태 뱃지를 판별합니다.
 */
export function resolveAttendanceBillingBadge(
  student: AttendanceBillingStudent,
  selectedDate: string,
  summary?: StudentMonthlyBillingSummary
): AttendanceBillingBadgeInfo | null {
  const unpaidAmount = (summary?.grandUnpaid ?? summary?.totalUnpaid) || 0;

  // selectedDate (YYYY-MM-DD) 파싱
  const parts = selectedDate.split('-');
  const currentDay = parts[2] ? parseInt(parts[2], 10) : new Date().getDate();
  const paymentDay =
    typeof student.paymentDay === 'number' && student.paymentDay >= 1 && student.paymentDay <= 31
      ? student.paymentDay
      : 10;

  // 1. 미납금이 존재하는 경우
  if (unpaidAmount > 0) {
    if (currentDay === paymentDay) {
      return {
        type: 'due_today',
        label: `오늘 결제일 · ${formatShortCurrency(unpaidAmount)}`,
        tooltip: `오늘(매월 ${paymentDay}일)이 수강료 결제일입니다. 미납액: ${unpaidAmount.toLocaleString()}원`,
        unpaidAmount,
        toneClass:
          'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-100',
        isActionable: true,
      };
    }

    if (currentDay > paymentDay) {
      const overdueDays = currentDay - paymentDay;
      return {
        type: 'overdue',
        label: `미납 D+${overdueDays}일 · ${formatShortCurrency(unpaidAmount)}`,
        tooltip: `결제일(${paymentDay}일)로부터 ${overdueDays}일 경과되었습니다. 미납액: ${unpaidAmount.toLocaleString()}원`,
        unpaidAmount,
        toneClass:
          'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/30 hover:bg-rose-100 animate-pulse',
        isActionable: true,
      };
    }

    // 이전 달부터 미납이 누적되어 현재 결제일 전인데도 미납이 있는 경우
    return {
      type: 'overdue',
      label: `미납 · ${formatShortCurrency(unpaidAmount)}`,
      tooltip: `이전 미납 수강료가 있습니다. 결제 예정일: 매월 ${paymentDay}일 / 미납액: ${unpaidAmount.toLocaleString()}원`,
      unpaidAmount,
      toneClass:
        'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/30 hover:bg-rose-100',
      isActionable: true,
    };
  }

  // 2. 미납금이 없으나 오늘이 결제일인 경우
  if (currentDay === paymentDay) {
    return {
      type: 'due_today',
      label: '오늘 결제일',
      tooltip: `오늘이 매월 정기 결제일(${paymentDay}일)입니다.`,
      unpaidAmount: 0,
      toneClass:
        'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      isActionable: true,
    };
  }

  // 3. 결제일 임박 (D-1 ~ D-3)
  if (currentDay < paymentDay && paymentDay - currentDay <= 3) {
    const diff = paymentDay - currentDay;
    return {
      type: 'due_soon',
      label: `결제 D-${diff}`,
      tooltip: `수강료 결제일(${paymentDay}일)이 ${diff}일 남았습니다.`,
      unpaidAmount: 0,
      toneClass:
        'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      isActionable: true,
    };
  }

  // 4. 평상시 완납 상태는 화면을 복잡하게 하지 않기 위해 뱃지 생략
  return null;
}
