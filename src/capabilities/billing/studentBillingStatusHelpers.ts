/**
 * Student Billing Status Helpers
 *
 * 오늘 수업/출결 학생 목록에서 결제일 경과 및 미납 상태를
 * 원터치 뱃지로 시각화하기 위한 도메인 유틸리티.
 */

export interface StudentUnpaidBadgeInfo {
  studentId: string;
  unpaidAmount: number;
  label: string; // "미납 18만", "미납"
  isOverdue: boolean; // 결제일 경과 여부
  tooltip: string;
}

/**
 * 미납 금액과 결제일을 기반으로 미납 뱃지 정보 생성
 */
export function resolveStudentUnpaidBadge(
  studentId: string,
  unpaidAmount: number,
  paymentDay?: number | null,
  currentDayOfMonth: number = new Date().getDate()
): StudentUnpaidBadgeInfo | null {
  if (!unpaidAmount || unpaidAmount <= 0) {
    return null;
  }

  const isOverdue = paymentDay ? currentDayOfMonth > paymentDay : true;
  const manUnit = Math.round(unpaidAmount / 10000);
  const amountStr = manUnit > 0 ? `${manUnit}만` : `${unpaidAmount.toLocaleString()}원`;
  const label = `미납 ${amountStr}`;

  let tooltip = `미납 금액: ${unpaidAmount.toLocaleString()}원`;
  if (paymentDay) {
    tooltip += isOverdue
      ? ` (결제일: 매월 ${paymentDay}일 · 결제일 경과)`
      : ` (결제일: 매월 ${paymentDay}일)`;
  }

  return {
    studentId,
    unpaidAmount,
    label,
    isOverdue,
    tooltip,
  };
}
