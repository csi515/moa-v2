/**
 * 원생 중심 올인원 360도 팝업 헤더 퀵 액션 및 KPI 계산 헬퍼
 */

export interface AttendanceLikeRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | string;
}

export interface BillingSummaryLike {
  unpaidAmount: number;
  totalTuitionAmount?: number;
  isPaid?: boolean;
  unpaidMonthsCount?: number;
}

/**
 * 오늘 날짜의 출결 상태 조회
 */
export function getTodayAttendanceStatus(
  records: AttendanceLikeRecord[] = [],
  todayIso: string
): { isChecked: boolean; status?: string; label: string } {
  const todayRecord = records.find(r => r.date === todayIso);
  if (!todayRecord) {
    return { isChecked: false, label: '오늘 미체크' };
  }

  switch (todayRecord.status) {
    case 'present':
      return { isChecked: true, status: 'present', label: '오늘 출석 완료' };
    case 'absent':
      return { isChecked: true, status: 'absent', label: '오늘 결석' };
    case 'late':
      return { isChecked: true, status: 'late', label: '오늘 지각' };
    case 'excused':
      return { isChecked: true, status: 'excused', label: '오늘 보강/공결' };
    default:
      return { isChecked: true, status: todayRecord.status, label: '오늘 출결 완료' };
  }
}

/**
 * 수강료 요약 상태 텍스트 산출
 */
export function getTuitionSummaryText(summary?: BillingSummaryLike): {
  hasUnpaid: boolean;
  unpaidAmount: number;
  badgeLabel: string;
} {
  const unpaid = summary?.unpaidAmount || 0;
  if (unpaid > 0) {
    return {
      hasUnpaid: true,
      unpaidAmount: unpaid,
      badgeLabel: `미납 ${unpaid.toLocaleString()}원`,
    };
  }
  return {
    hasUnpaid: false,
    unpaidAmount: 0,
    badgeLabel: '당월 완납',
  };
}
