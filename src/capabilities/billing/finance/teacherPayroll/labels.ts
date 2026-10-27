import type { TeacherPayType } from '@/types';
import type { PayrollSettlementStatus } from './types';

export function payTypeUsesUnitRate(payType: TeacherPayType): boolean {
  return payType === 'hourly' || payType === 'attendance' || payType === 'work_hours';
}

export function payTypeLabel(payType: TeacherPayType): string {
  switch (payType) {
    case 'hourly':
      return '수업 실적';
    case 'attendance':
      return '출근 횟수';
    case 'work_hours':
      return '근무 시간';
    case 'monthly':
      return '월급';
    default:
      return '미설정';
  }
}

export function payTypeRateUnitLabel(payType: TeacherPayType): string {
  switch (payType) {
    case 'hourly':
      return '원 / 회';
    case 'attendance':
      return '원 / 출근';
    case 'work_hours':
      return '원 / 시간';
    case 'monthly':
      return '원 / 월';
    default:
      return '원';
  }
}

export function quantityUnitLabel(payType: TeacherPayType): string {
  switch (payType) {
    case 'hourly':
    case 'attendance':
      return '회';
    case 'work_hours':
      return '시간';
    case 'monthly':
      return '개월';
    default:
      return '';
  }
}

export function settlementStatusLabel(status: PayrollSettlementStatus): string {
  if (status === 'expensed') return '지출 등록';
  if (status === 'confirmed') return '정산 완료';
  return '미정산';
}

export function formatPayrollPeriod(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return `${y}.${mm}.01 ~ ${y}.${mm}.${String(lastDay).padStart(2, '0')}`;
}

export function formatPayrollFormula(params: {
  payType: TeacherPayType;
  quantity: number;
  rate: number;
}): string {
  const { payType, quantity, rate } = params;
  if (payType === 'monthly') {
    return `월급 ${rate.toLocaleString('ko-KR')}원`;
  }
  if (payType === 'none' || rate <= 0) return '-';
  if ((payType === 'attendance' || payType === 'work_hours') && quantity <= 0) {
    return '수동 입력 필요';
  }
  return `${quantity}${quantityUnitLabel(payType)} × ${rate.toLocaleString('ko-KR')}원`;
}

export function formatPayRateDisplay(payType: TeacherPayType, rate: number): string {
  const amount = `₩${rate.toLocaleString('ko-KR')}`;
  if (payType === 'monthly') return `${amount} / 월`;
  const unit = payTypeRateUnitLabel(payType).replace(/^원\s*/, '');
  return `${amount} ${unit}`;
}
