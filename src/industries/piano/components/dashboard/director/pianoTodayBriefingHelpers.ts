/**
 * 피아노 원장 대시보드 [오늘의 학원 3초 브리핑] 데이터 산출 헬퍼
 */

export interface BriefingStudentLike {
  id: string;
  name: string;
  birthDate?: string;
  grade?: string;
  paymentDay?: number;
  tuitionFee?: number;
  status?: string;
}

export interface BriefingInvoiceLike {
  id: string;
  studentId: string;
  unpaidAmount: number;
  dueDate?: string;
}

export interface TodayAttendanceBriefing {
  totalExpected: number;
  presentCount: number;
  uncheckedCount: number;
  absentCount: number;
}

export interface TodayBirthdayStudent {
  id: string;
  name: string;
  grade?: string;
  birthDate: string;
  isToday: boolean;
}

export interface TodayPaymentBriefing {
  todayDueCount: number;
  todayDueAmount: number;
  totalUnpaidCount: number;
  totalUnpaidAmount: number;
  studentNames: string[];
}

export interface TodayCareAlertBriefing {
  makeupPendingCount: number;
  absentCount: number;
  needsAttentionCount: number;
  alertMessage?: string;
}

export interface Director3SecBriefingData {
  attendance: TodayAttendanceBriefing;
  birthdays: TodayBirthdayStudent[];
  payment: TodayPaymentBriefing;
  careAlert: TodayCareAlertBriefing;
  oneLineSummary: string;
}

/**
 * 오늘 생일인 원생(월-일 일치) 및 이번 주 생일 원생 필터링
 */
export function resolveTodayBirthdayStudents(
  students: BriefingStudentLike[],
  todayIso: string
): TodayBirthdayStudent[] {
  const activeStudents = students.filter(s => s.status !== 'withdrawn' && s.status !== 'expelled');
  const [, todayMonth, todayDay] = todayIso.split('-'); // YYYY-MM-DD
  if (!todayMonth || !todayDay) return [];

  const targetMD = `${todayMonth}-${todayDay}`;
  const birthdayStudents: TodayBirthdayStudent[] = [];

  for (const s of activeStudents) {
    if (!s.birthDate) continue;
    // birthDate 형식: YYYY-MM-DD 또는 MM-DD
    const parts = s.birthDate.split('-');
    let sMD = '';
    if (parts.length === 3) {
      sMD = `${parts[1]}-${parts[2]}`;
    } else if (parts.length === 2) {
      sMD = `${parts[0]}-${parts[1]}`;
    }

    if (sMD === targetMD) {
      birthdayStudents.push({
        id: s.id,
        name: s.name,
        grade: s.grade,
        birthDate: s.birthDate,
        isToday: true,
      });
    }
  }

  return birthdayStudents;
}

/**
 * 오늘 수강료 결제일(paymentDay)이 도래한 원생 및 미납 현황 산출
 */
export function resolveTodayPaymentBriefing(
  students: BriefingStudentLike[],
  invoices: BriefingInvoiceLike[],
  todayIso: string
): TodayPaymentBriefing {
  const activeStudents = students.filter(s => s.status !== 'withdrawn' && s.status !== 'expelled');
  const todayDayNum = Number(todayIso.split('-')[2] || '1');

  // 오늘이 수강료 결제일인 원생들
  const todayDueStudents = activeStudents.filter(s => s.paymentDay === todayDayNum);
  const todayDueAmount = todayDueStudents.reduce((sum, s) => sum + (s.tuitionFee || 0), 0);

  // 미납 청구서 합계
  const unpaidInvoices = invoices.filter(inv => inv.unpaidAmount > 0);
  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.unpaidAmount, 0);

  const unpaidStudentIdSet = new Set(unpaidInvoices.map(i => i.studentId));

  return {
    todayDueCount: todayDueStudents.length,
    todayDueAmount,
    totalUnpaidCount: unpaidStudentIdSet.size,
    totalUnpaidAmount,
    studentNames: todayDueStudents.map(s => s.name),
  };
}

/**
 * 오늘의 3초 한줄 브리핑 멘트 생성
 */
export function buildDailyOneLineSummary(
  attendance: TodayAttendanceBriefing,
  birthdays: TodayBirthdayStudent[],
  payment: TodayPaymentBriefing,
  careAlert: TodayCareAlertBriefing
): string {
  const parts: string[] = [];

  if (birthdays.length > 0) {
    const names = birthdays.map(b => b.name).join(', ');
    parts.push(`🎂 오늘 ${names} 원생의 생일입니다! 특별한 축하를 전해주세요.`);
  }

  if (attendance.totalExpected > 0) {
    parts.push(`오늘 총 ${attendance.totalExpected}명의 원생 등원이 예정되어 있습니다.`);
  } else {
    parts.push('오늘은 정규 수업 예정이 없는 날입니다.');
  }

  if (careAlert.makeupPendingCount > 0) {
    parts.push(`보강 대기 원생이 ${careAlert.makeupPendingCount}명 있습니다.`);
  }

  if (payment.todayDueCount > 0) {
    parts.push(`오늘 수강료 결제 예정 원생은 ${payment.todayDueCount}명입니다.`);
  }

  return parts.join(' ');
}
