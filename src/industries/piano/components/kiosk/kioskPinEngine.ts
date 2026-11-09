export interface KioskStudentMatch {
  id: string;
  name: string;
  phone?: string;
  pin?: string;
}

export interface KioskAttendanceResult {
  success: boolean;
  message: string;
  studentName?: string;
  timestamp?: string;
  actionType?: 'checkin' | 'checkout';
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

/**
 * 키오스크 4자리 출석 처리 로직
 */
export function processKioskCheckin(
  pin: string,
  students: KioskStudentMatch[]
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

  return {
    success: true,
    message: `${student.name} 원생 출석이 완료되었습니다. (${timeStr})`,
    studentName: student.name,
    timestamp: timeStr,
    actionType: 'checkin',
  };
}
