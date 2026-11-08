/**
 * 피아노 신규 원장님을 위한 3분 학원 세팅 온보딩 마법사 도메인 헬퍼
 */

export interface OnboardingOperatingHours {
  operatingDays: string[]; // ['월', '화', '수', '목', '금']
  startTime: string; // '13:00'
  endTime: string; // '19:00'
  lessonDurationMinutes: number; // 50
}

export interface OnboardingStudentDraft {
  name: string;
  grade?: string;
  parentName?: string;
  parentPhone: string;
  courseSubject: string;
  tuitionFee: number;
}

export interface OnboardingTimetablePlacement {
  dayOfWeek: string; // '월'
  startTime: string; // '14:00'
  teacherName?: string;
}

export interface OnboardingWizardState {
  currentStep: 1 | 2 | 3 | 4; // 1: 운영시간, 2: 첫원생, 3: 시간표, 4: 완료
  operatingHours: OnboardingOperatingHours;
  studentDraft: OnboardingStudentDraft;
  placementDraft: OnboardingTimetablePlacement;
  isCompleted: boolean;
}

export const DEFAULT_OPERATING_HOURS: OnboardingOperatingHours = {
  operatingDays: ['월', '화', '수', '목', '금'],
  startTime: '13:00',
  endTime: '19:00',
  lessonDurationMinutes: 50,
};

export const DEFAULT_STUDENT_DRAFT: OnboardingStudentDraft = {
  name: '',
  grade: '초2',
  parentName: '',
  parentPhone: '',
  courseSubject: '피아노 바이엘',
  tuitionFee: 180000,
};

export const DEFAULT_PLACEMENT_DRAFT: OnboardingTimetablePlacement = {
  dayOfWeek: '월',
  startTime: '14:00',
  teacherName: '원장님',
};

/**
 * 온보딩 마법사 상태를 로컬스토리지에서 로드
 */
export function getOnboardingStorageKey(organizationId?: string): string {
  return `moa_piano_onboarding_wizard_${organizationId || 'default'}`;
}

/**
 * 1단계 운영시간 유효성 검사
 */
export function validateOperatingHours(hours: OnboardingOperatingHours): { isValid: boolean; message?: string } {
  if (hours.operatingDays.length === 0) {
    return { isValid: false, message: '최소 1개 이상의 운영 요일을 선택해 주세요.' };
  }
  if (!hours.startTime || !hours.endTime) {
    return { isValid: false, message: '시작 시간과 종료 시간을 입력해 주세요.' };
  }
  if (hours.startTime >= hours.endTime) {
    return { isValid: false, message: '종료 시간은 시작 시간보다 늦어야 합니다.' };
  }
  return { isValid: true };
}

/**
 * 2단계 첫 원생 정보 유효성 검사
 */
export function validateStudentDraft(student: OnboardingStudentDraft): { isValid: boolean; message?: string } {
  const cleanName = student.name.trim();
  if (!cleanName) {
    return { isValid: false, message: '원생 이름을 입력해 주세요.' };
  }
  const cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 9) {
    return { isValid: false, message: '올바른 학부모 연락처를 입력해 주세요.' };
  }
  if (student.tuitionFee < 0) {
    return { isValid: false, message: '수강료는 0원 이상이어야 합니다.' };
  }
  return { isValid: true };
}

/**
 * 3단계 시간표 배치 정보 유효성 검사
 */
export function validatePlacementDraft(placement: OnboardingTimetablePlacement): { isValid: boolean; message?: string } {
  if (!placement.dayOfWeek) {
    return { isValid: false, message: '수업 요일을 선택해 주세요.' };
  }
  if (!placement.startTime) {
    return { isValid: false, message: '수업 시작 시간을 선택해 주세요.' };
  }
  return { isValid: true };
}

/**
 * 운영 시간에 따른 선택 가능한 30분/50분 레슨 슬롯 목록 생성
 */
export function generateAvailableLessonTimeSlots(startTime: string, endTime: string, stepMinutes: number = 60): string[] {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMin = (startH || 13) * 60 + (startM || 0);
  const endMin = (endH || 19) * 60 + (endM || 0);

  const slots: string[] = [];
  while (currentMin < endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMin += stepMinutes;
  }
  return slots;
}
