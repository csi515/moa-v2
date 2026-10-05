import { getIndustryPlugin } from '@/core/industry/pluginHost';
import { parseIndustryType } from '@/core/industry/types';

/**
 * 학생 상세의 소프트 종료 확인·버튼에만 쓰는 동작 라벨.
 * 업종 id를 비교하지 않는다. usesWithdrawalExitLabel 이 켜진 플러그인만 '퇴원'.
 * 지금은 피아노·어린이집 매니페스트만 true다. preschool·kindergarten 은
 * 어린이집 플러그인으로 풀린 뒤 같은 라벨을 받는다.
 * 빈 값과 카탈로그 밖은 피아노 플러그인으로 떨어지지 않게 '종료'다.
 */
export function getStudentExitActionLabel(
  industry: string | null | undefined
): '퇴원' | '종료' {
  const resolved = parseIndustryType(industry);
  if (!resolved) return '종료';
  return getIndustryPlugin(resolved).usesWithdrawalExitLabel ? '퇴원' : '종료';
}
