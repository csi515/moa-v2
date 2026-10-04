import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import {
  getCustomerLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  isDaycareIndustry,
  isGymIndustry,
  isPilatesIndustry,
  isSkinClinicIndustry,
  showsTextbooksLink,
} from '@/core/industry/industryUi';
import { PIN_ATTENDANCE_PARENT_COPY } from './attendanceNotifyCopy';

/**
 * 출결 화면 문구.
 * 명사(등하원/출입/출결, 고객 호칭, 장소)만 고르고 체크인 동작은 바꾸지 않는다.
 * 피아노·어린이집·피부·필라테스·체육관은 지금 문구를 유지한다.
 * 그 구분은 업종 id 문자열이 아니라 기존 플래그다.
 * showsTextbooksLink는 현재 피아노 매니페스트만 true다.
 */

function resolved(industry: IndustryType | string | null | undefined) {
  return normalizeIndustryType(industry);
}

export function usesFrozenAttendanceCopy(
  industry: IndustryType | string | null | undefined,
): boolean {
  const type = resolved(industry);
  return (
    showsTextbooksLink(type) ||
    isDaycareIndustry(type) ||
    isSkinClinicIndustry(type) ||
    isPilatesIndustry(type) ||
    isGymIndustry(type)
  );
}

/** 기록 제목의 명사. 어린이집은 등하원, 예약 업종은 출입, 그 외는 출결. */
export function attendanceRecordNoun(
  industry: IndustryType | string | null | undefined,
): '등하원' | '출입' | '출결' {
  const type = resolved(industry);
  if (isDaycareIndustry(type)) return '등하원';
  if (isAppointmentIndustry(type)) return '출입';
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
  return isDaycareIndustry(resolved(industry)) ? '등원 관리' : 'PIN 출석';
}

export function attendancePresentLabel(
  industry: IndustryType | string | null | undefined,
): '등원' | '출석' {
  return isDaycareIndustry(resolved(industry)) ? '등원' : '출석';
}

export function attendancePresentTimeLabel(
  industry: IndustryType | string | null | undefined,
): string {
  return isDaycareIndustry(resolved(industry)) ? '등원' : '출석 시각';
}

export function attendanceMemoSavedToast(
  industry: IndustryType | string | null | undefined,
): string {
  return isDaycareIndustry(resolved(industry))
    ? '하원·전달 메모를 저장했습니다.'
    : '출석 메모를 저장했습니다.';
}

export function attendanceMemoCopy(
  industry: IndustryType | string | null | undefined,
): { titleSuffix: string; hint: string; placeholder: string } {
  if (isDaycareIndustry(resolved(industry))) {
    return {
      titleSuffix: '하원·전달 메모',
      hint: '세션 메모 · 등원 후 전달 사항 기록',
      placeholder: '예: 조부모님 하원, 16:30 픽업 예정',
    };
  }
  return {
    titleSuffix: '출석 메모',
    hint: '세션 메모 · 출석 관련 전달 사항',
    placeholder: '예: 조부모님이 데리러 오심, 16:30 예정',
  };
}

/**
 * 키오스크·PIN 안내의 사람 명사.
 * 전용 다섯 업종은 지금처럼 학생. 그 외는 customerLabel.
 */
export function attendancePersonNoun(
  industry: IndustryType | string | null | undefined,
): string {
  if (usesFrozenAttendanceCopy(industry)) return '학생';
  return getCustomerLabel(resolved(industry));
}

export function attendancePinDisabledDescription(
  industry: IndustryType | string | null | undefined,
  customerSingular: string,
): string {
  const type = resolved(industry);
  if (isSkinClinicIndustry(type)) {
    return `설정에서 ${customerSingular} PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.`;
  }
  return `설정에서 ${attendancePersonNoun(type)} PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.`;
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
  if (usesFrozenAttendanceCopy(industry)) {
    return '이미 출석한 학생이 다시 입력하면 안내만 표시됩니다';
  }
  return `이미 출석한 ${attendancePersonNoun(industry)}이(가) 다시 입력하면 안내만 표시됩니다`;
}

export function kioskAdminExitBody(
  industry: IndustryType | string | null | undefined,
): string {
  if (usesFrozenAttendanceCopy(industry)) {
    return '키오스크를 종료하고 일반 관리 화면으로 이동합니다. 학생이 아닌 관리자만 진행하세요.';
  }
  return `키오스크를 종료하고 일반 관리 화면으로 이동합니다. ${attendancePersonNoun(industry)}이(가) 아닌 관리자만 진행하세요.`;
}

export function pinRevealHandoff(
  industry: IndustryType | string | null | undefined,
  contactSingular: string,
  customerSingular: string,
): string {
  const type = resolved(industry);
  if (isSkinClinicIndustry(type)) {
    return `${contactSingular} 또는 ${customerSingular}에게 전달하세요`;
  }
  if (usesFrozenAttendanceCopy(type)) {
    return '학부모님 또는 학생에게 전달하세요';
  }
  return `${getCustomerLabel(type)}에게 전달하세요`;
}

/** 보호자 출결 빈 목록. 전용 업종은 기존 학원 문장. 그 외는 placeLabel. */
export function parentAttendanceEmpty(
  industry: IndustryType | string | null | undefined,
): string {
  if (usesFrozenAttendanceCopy(industry)) {
    return PIN_ATTENDANCE_PARENT_COPY.attendanceEmpty;
  }
  const place = getPlaceLabel(resolved(industry));
  return `아직 출결 기록이 없습니다. ${place}이(가) PIN 출석을 쓰면 자녀가 입구에서 출석한 기록이 여기에 쌓입니다. 출석 알림은 안내 탭에서도 확인할 수 있습니다.`;
}
