export interface KioskStudentMatch {
  id: string;
  name: string;
  phone?: string;
  pin?: string;
}

export interface KioskAttendanceResult {
  success: boolean;
  message: string;
  studentId?: string;
  studentName?: string;
  timestamp?: string;
  actionType?: 'checkin' | 'checkout';
  // 엣지 6번: 키오스크 등원 번호 입력 시 당일 임시 슬롯 자동 바인딩 결과
  temporaryMoveApplied?: boolean;
  assignedSlotTime?: string;
  originalSlotTime?: string;
  temporaryMoveMemo?: string;
}

const MASTER_EXIT_PIN = '9999';

/**
 * 4자리 PIN(원생 전화번호 뒷 4자리 또는 원생 PIN)으로 학생을 조회합니다.
 */
export function matchStudentByPin(
  pin: string,
  students: KioskStudentMatch[]
): KioskStudentMatch | null {
  if (!pin || pin.length !== 4) return null;

  // 1. pin 필드 일치 확인
  const directMatch = students.find((s) => s.pin === pin);
  if (directMatch) return directMatch;

  // 2. 전화번호 뒷 4자리 일치 확인
  const phoneMatch = students.find((s) => {
    if (!s.phone) return false;
    const cleanPhone = s.phone.replace(/[^0-9]/g, '');
    return cleanPhone.endsWith(pin);
  });

  return phoneMatch || null;
}

/**
 * 관리자 키오스크 탈출 PIN 확인
 */
export function verifyMasterExitPin(pin: string, customMasterPin?: string): boolean {
  const target = customMasterPin?.trim() || MASTER_EXIT_PIN;
  return pin.trim() === target;
}

export interface KioskCheckinOptions {
  todayIso?: string;
  temporaryMoves?: Array<{
    studentId: string;
    originalStartTime: string;
    targetStartTime: string;
    targetDate?: string;
    memo?: string;
  }>;
}

/**
 * 키오스크 4자리 출석 처리 로직 (엣지 6번: 임시 이동 슬롯 자동 인식)
 */
export function processKioskCheckin(
  pin: string,
  students: KioskStudentMatch[],
  options?: KioskCheckinOptions
): KioskAttendanceResult {
  if (pin.length !== 4) {
    return {
      success: false,
      message: '4자리 번호를 정확히 입력해주세요.',
    };
  }

  const student = matchStudentByPin(pin, students);
  if (!student) {
    return {
      success: false,
      message: '일치하는 원생 정보를 찾을 수 없습니다.',
    };
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  // 엣지 6번: 당일 임시 이동 레코드 자동 감지
  const today = options?.todayIso || now.toISOString().slice(0, 10);
  const tempMove = (options?.temporaryMoves || []).find(
    (m) => m.studentId === student.id && (m.targetDate ? m.targetDate === today : true)
  );

  if (tempMove) {
    return {
      success: true,
      message: `${student.name} 원생 출석이 완료되었습니다. (오늘 임시 ${tempMove.targetStartTime} 수업 배정)`,
      studentId: student.id,
      studentName: student.name,
      timestamp: timeStr,
      actionType: 'checkin',
      temporaryMoveApplied: true,
      assignedSlotTime: tempMove.targetStartTime,
      originalSlotTime: tempMove.originalStartTime,
      temporaryMoveMemo: tempMove.memo,
    };
  }

  return {
    success: true,
    message: `${student.name} 원생 출석이 완료되었습니다. (${timeStr})`,
    studentId: student.id,
    studentName: student.name,
    timestamp: timeStr,
    actionType: 'checkin',
  };
}
