import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import {
  getAttendanceCopy,
  getCustomerLabel,
  getPlaceLabel,
  isAppointmentIndustry,
} from '@/core/industry/industryUi';
import { PIN_ATTENDANCE_PARENT_COPY } from './attendanceNotifyCopy';

/**
 * 출결 화면 문구.
 * 업종 id로 문장을 고르지 않는다.
 * 플러그인 attendanceCopy가 있으면 그 문장, 없으면 placeLabel·customerLabel·isAppointment.
 */

const DEFAULT_MEMO = {
  titleSuffix: '출석 메모',
  hint: '세션 메모 · 출석 관련 전달 사항',
  placeholder: '예: 조부모님이 데리러 오심, 16:30 예정',
} as const;

function resolved(industry: IndustryType | string | null | undefined) {
  return normalizeIndustryType(industry);
}

/** 기록 제목의 명사. 플러그인 명사, 없으면 예약 업종은 출입, 그 외는 출결. */
export function attendanceRecordNoun(
  industry: IndustryType | string | null | undefined,
): '등하원' | '출입' | '출결' {
  const noun = getAttendanceCopy(industry)?.recordNoun;
  if (noun) return noun;
  if (isAppointmentIndustry(industry)) return '출입';
  return '출결';
}

export function attendanceRecordTitle(
  industry: IndustryType | string | null | undefined,
  name: string,
): string {
  return `${name} ${attendanceRecordNoun(industry)} 기록`;
}

export function attendanceManageTitle(
  industry: IndustryType | string | null | undefined,
): string {
  return getAttendanceCopy(industry)?.manageTitle ?? 'PIN 출석';
}

export function attendancePresentLabel(
  industry: IndustryType | string | null | undefined,
): '등원' | '출석' {
  return getAttendanceCopy(industry)?.presentLabel ?? '출석';
}

export function attendancePresentTimeLabel(
  industry: IndustryType | string | null | undefined,
): string {
  return getAttendanceCopy(industry)?.presentTimeLabel ?? '출석 시각';
}

export function attendanceMemoSavedToast(
  industry: IndustryType | string | null | undefined,
): string {
  return getAttendanceCopy(industry)?.memoSavedToast ?? '출석 메모를 저장했습니다.';
}

export function attendanceMemoCopy(
  industry: IndustryType | string | null | undefined,
): { titleSuffix: string; hint: string; placeholder: string } {
  return getAttendanceCopy(industry)?.memo ?? DEFAULT_MEMO;
}

/** 키오스크·PIN 안내의 사람 명사. 플러그인 명사, 없으면 customerLabel. */
export function attendancePersonNoun(
  industry: IndustryType | string | null | undefined,
): string {
  return getAttendanceCopy(industry)?.personNoun ?? getCustomerLabel(resolved(industry));
}

export function attendancePinDisabledDescription(
  industry: IndustryType | string | null | undefined,
  customerSingular: string,
): string {
  const copy = getAttendanceCopy(industry);
  const noun = copy?.pinDisabledUsesCustomerLabel ? customerSingular : attendancePersonNoun(industry);
  return `설정에서 ${noun} PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.`;
}

export function kioskCheckInSuccess(
  industry: IndustryType | string | null | undefined,
  customerName: string,
): string {
  return `${customerName} ${attendancePersonNoun(industry)} 출석이 완료되었습니다.`;
}

export function kioskAlreadyCheckedMessage(
  industry: IndustryType | string | null | undefined,
  customerName?: string,
): string {
  const who = customerName ?? attendancePersonNoun(industry);
  return `${who}님은 이미 출석 처리되었습니다.`;
}

export function kioskModuleDisabledHint(
  industry: IndustryType | string | null | undefined,
): string {
  return `설정에서 ${attendancePersonNoun(industry)} PIN 출결을 활성화한 뒤 사용할 수 있습니다.`;
}

export function kioskEyebrow(
  industry: IndustryType | string | null | undefined,
): string {
  return `${attendancePersonNoun(industry)} 출석`;
}

export function kioskNoPinHint(
  industry: IndustryType | string | null | undefined,
): string {
  return `${attendancePersonNoun(industry)} 관리에서 출결 PIN을 먼저 발급해 주세요.`;
}

export function kioskRepeatHint(
  industry: IndustryType | string | null | undefined,
): string {
  const custom = getAttendanceCopy(industry)?.kioskRepeatHint;
  if (custom) return custom;
  return `이미 출석한 ${attendancePersonNoun(industry)}이(가) 다시 입력하면 안내만 표시됩니다`;
}

export function kioskAdminExitBody(
  industry: IndustryType | string | null | undefined,
): string {
  const custom = getAttendanceCopy(industry)?.kioskAdminExitBody;
  if (custom) return custom;
  return `키오스크를 종료하고 일반 관리 화면으로 이동합니다. ${attendancePersonNoun(industry)}이(가) 아닌 관리자만 진행하세요.`;
}

export function pinRevealHandoff(
  industry: IndustryType | string | null | undefined,
  contactSingular: string,
  customerSingular: string,
): string {
  const copy = getAttendanceCopy(industry);
  if (copy?.pinRevealUsesContactOrCustomer) {
    return `${contactSingular} 또는 ${customerSingular}에게 전달하세요`;
  }
  if (copy?.pinRevealHandoff) return copy.pinRevealHandoff;
  return `${getCustomerLabel(resolved(industry))}에게 전달하세요`;
}

/** 보호자 출결 빈 목록. academy 훅이면 기존 학원 문장, 아니면 placeLabel. */
export function parentAttendanceEmpty(
  industry: IndustryType | string | null | undefined,
): string {
  if (getAttendanceCopy(industry)?.parentEmpty === 'academy') {
    return PIN_ATTENDANCE_PARENT_COPY.attendanceEmpty;
  }
  const place = getPlaceLabel(resolved(industry));
  return `아직 출결 기록이 없습니다. ${place}이(가) PIN 출석을 쓰면 자녀가 입구에서 출석한 기록이 여기에 쌓입니다. 출석 알림은 안내 탭에서도 확인할 수 있습니다.`;
}
