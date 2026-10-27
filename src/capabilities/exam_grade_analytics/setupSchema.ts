import type { CapabilitySetupSchema } from '@/core/presets/types';

export const examGradeAnalyticsSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'exam_grade_analytics',
  title: '단원평가 성적 채점 & 취약영역 레이더 분석 설정',
  description: '시험 점수 입력 시 반 평균/표준편차(Z-Score) 산출 및 취약 영역 판정 기준을 설정합니다.',
  fields: [
    {
      id: 'enableZScoreRanking',
      label: 'Z-Score 및 표준편차 백분위 표시',
      type: 'boolean',
      defaultValue: true,
      description: '시험 결과표에 반 평균 및 Z-Score 표준편차 지수를 산출하여 표시합니다.',
    },
    {
      id: 'weakThresholdPercentage',
      label: '취약 단원 경고 기준 득점률(%)',
      type: 'number',
      defaultValue: 65,
      description: '영역별 득점률이 이 수치 미만인 경우 취약 단원으로 강조 표시합니다.',
    },
  ],
};
