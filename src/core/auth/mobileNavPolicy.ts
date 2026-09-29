import type { NavTab } from '@/shared/navigation/navigationTypes';

/** 모바일 하단 핵심 탭 권장 수 (더보기 제외) */
export const MOBILE_MAIN_TAB_RECOMMENDED = 4;
/** 하단이 붐비지 않도록 하는 상한 (더보기 제외) */
export const MOBILE_MAIN_TAB_MAX = 5;

export interface MobileMainNavSpec {
  /** 하단 고정 핵심 탭. 더보기는 포함하지 않는다. */
  tabs: readonly NavTab[];
  /**
   * 권장 4개를 넘기거나 업종 특수 배치를 쓰는 이유.
   * 표준(핵심 4 + 더보기)이면 생략한다.
   */
  reason?: string;
}

export function defineMobileMainNav(spec: MobileMainNavSpec): MobileMainNavSpec {
  return spec;
}

export function mobileMainNavIssues(spec: MobileMainNavSpec): string[] {
  const issues: string[] = [];
  if (spec.tabs.length === 0) {
    issues.push('핵심 탭이 비어 있습니다.');
  }
  if (spec.tabs.length > MOBILE_MAIN_TAB_MAX) {
    issues.push(`핵심 탭은 ${MOBILE_MAIN_TAB_MAX}개를 넘을 수 없습니다.`);
  }
  if (spec.tabs.length > MOBILE_MAIN_TAB_RECOMMENDED && !spec.reason) {
    issues.push(`권장 ${MOBILE_MAIN_TAB_RECOMMENDED}개를 넘기면 reason이 필요합니다.`);
  }
  if (new Set(spec.tabs).size !== spec.tabs.length) {
    issues.push('핵심 탭에 중복이 있습니다.');
  }
  return issues;
}
