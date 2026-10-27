import type { CapabilitySetupSchema } from '@/core/presets/types';

export const vendorScorecardSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'vendor_scorecard',
  title: '거래처 다면 평가 및 등급 기준 설정',
  description: '납기, 품질 불량률, 가격 경쟁력 가중치를 설정하여 최우수 거래처와 재검토 대상을 산출합니다.',
  fields: [
    {
      id: 'min_excellent_tier_score',
      label: '최우수 거래처(A등급) 기준 점수',
      type: 'number',
      defaultValue: 90,
      description: '종합 평가 점수가 이 기준 이상인 공급업체를 우선 발주 대상으로 지정합니다.',
    },
    {
      id: 'probation_threshold_score',
      label: '거래 재검토(D등급) 경고 기준 점수',
      type: 'number',
      defaultValue: 70,
      description: '종합 평가 점수가 이 기준 미만일 때 거래처 계약 재검토 경고를 표시합니다.',
    },
  ],
};
