import type { CapabilitySetupSchema } from '@/core/presets/types';

export const packageSplitBillingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'package_split_billing',
  title: '복합 패키지 분할 매출 귀속 설정',
  description: '결합 상품 일시불 결제액의 선수금 부채 보관 및 소진 시 매출 실현 규칙을 설정합니다.',
  fields: [
    {
      id: 'fairTradePenaltyRate',
      label: '중도 해지 표준 위약금 비율(0.0~0.3)',
      type: 'number',
      defaultValue: 0.1,
      description: '패키지 중도 환불 시 공제하는 공정위 기준 위약금 요율입니다 (기본: 10% = 0.1).',
    },
    {
      id: 'autoRealizeOnCheckIn',
      label: '출석 체크인 시 횟수 자동 실현',
      type: 'boolean',
      defaultValue: true,
      description: '회원이 출결 태그 시 해당 패키지의 세션을 1회 자동 소진하여 당월 매출로 전입합니다.',
    },
  ],
};
