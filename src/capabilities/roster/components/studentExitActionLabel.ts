import { parseIndustryType, type IndustryType } from '@/core/industry/types';

/**
 * 학생 상세의 소프트 종료 확인·버튼에만 쓰는 동작 라벨.
 * 매니페스트·모듈 라벨에는 이 단어를 담는 필드가 없다.
 * 업종 카피에 이미 있는 말만 쓴다: 피아노·어린이집은 퇴원, 피부·그 외는 종료.
 */
const ACADEMY_EXIT_INDUSTRIES = new Set<IndustryType>(['piano', 'daycare']);

export function getStudentExitActionLabel(
  industry: string | null | undefined
): '퇴원' | '종료' {
  const resolved = parseIndustryType(industry);
  if (resolved && ACADEMY_EXIT_INDUSTRIES.has(resolved)) return '퇴원';
  return '종료';
}
