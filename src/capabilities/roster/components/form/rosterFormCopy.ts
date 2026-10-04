import type { IndustryType } from '@/core/industry/types';
import { getFeeLabel } from '@/core/industry/industryUi';

/**
 * 원생 등록 폼의 피아노 전용 문구.
 * 시간표 배치 버튼은 피아노에만 있다. 명사는 업종 라벨을 쓴다.
 */
export function isPianoIndustry(
  industry: IndustryType | string | null | undefined,
): boolean {
  return industry === 'piano';
}

/** 고급 섹션 제목. 피아노는 기존 문구(가운데 점·공백, (선택) 없음)를 유지한다. */
export function rosterAdvancedSectionTitle(
  industry: IndustryType | string | null | undefined,
): string {
  if (isPianoIndustry(industry)) return '수업 · 수강료';
  return `수업·${getFeeLabel(industry)} (선택)`;
}

/**
 * 수업 배정 안내.
 * 피아노만 시간표 반영을 말한다. 다른 업종은 시간표 배치 UI를 열지 않는 중립 문장이다.
 */
export function rosterClassAssignHelper(
  industry: IndustryType | string | null | undefined,
  serviceLabel: string,
): string {
  if (isPianoIndustry(industry)) {
    return `선택한 ${serviceLabel}이(가) 시간표·일정에 반영됩니다. 나중에 추가해도 됩니다.`;
  }
  return `선택한 ${serviceLabel}은(는) 나중에 추가해도 됩니다.`;
}

/** 요금 블록 제목. 피아노 feeLabel이 수강료가 아니게 바뀌어도 기존 문구를 유지한다. */
export function rosterFeeInfoHeading(
  industry: IndustryType | string | null | undefined,
): string {
  if (isPianoIndustry(industry)) return '수강료 정보';
  return `${getFeeLabel(industry)} 정보`;
}

/** 월 청구 금액 라벨. 피아노는 기존 문구를 유지한다. */
export function rosterRegularFeeLabel(
  industry: IndustryType | string | null | undefined,
): string {
  if (isPianoIndustry(industry)) return '정규 수업 수강료';
  return `정규 수업 ${getFeeLabel(industry)}`;
}

/** 신규 등록 모달 설명. 피아노는 보호자·수강료 문구를 그대로 둔다. */
export function rosterCreateFormDescription(
  industry: IndustryType | string | null | undefined,
  contactLabel: string,
): string {
  if (isPianoIndustry(industry)) {
    return '기본정보 → 보호자 → 수업·수강료 순으로 입력하세요';
  }
  return `기본정보 → ${contactLabel} → 수업·${getFeeLabel(industry)} 순으로 입력하세요`;
}

/** 특이사항 placeholder. 연락처 명칭만 라벨을 쓴다. */
export function rosterNotesPlaceholder(contactLabel: string): string {
  return `예: 땅콩 알레르기, 왼손 주의, ${contactLabel} 전달사항…`;
}

/**
 * 등록 직후 안내.
 * 피아노는 서비스 라벨이 반일 때 기존 문장과 같다. 다른 업종은 시간표를 말하지 않는다.
 */
export function rosterPostSaveHint(
  industry: IndustryType | string | null | undefined,
  serviceLabel: string,
): string {
  if (isPianoIndustry(industry)) {
    return `아직은 ${serviceLabel}·시간표에 배정되지 않았습니다. 상세를 보거나 시간표에서 직접 배치하세요.`;
  }
  return '다음 작업을 선택하세요.';
}

/** 피아노 전용 시간표 배치 버튼. 다른 업종에는 이 버튼을 그리지 않는다. */
export const ROSTER_TIMETABLE_PLACE_BUTTON = '시간표에 배치';
