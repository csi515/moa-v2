import type { CapabilitySetupSchema } from '@/core/presets/types';

export const loyaltyStampSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'loyalty_stamp',
  title: '전자 스탬프 / 칭찬 스티커 설정',
  description: '종이 쿠폰 분실 없는 모바일 스탬프 적립 및 목표 달성 리워드 쿠폰 정책을 설정합니다.',
  fields: [
    {
      id: 'defaultTargetCount',
      label: '기본 스탬프 판 목표 칸수',
      type: 'number',
      defaultValue: 10,
      description: '쿠폰 1장을 완성하기 위해 필요한 스탬프 수 (일반적으로 10칸 또는 12칸).',
      required: true,
    },
    {
      id: 'defaultRewardTitle',
      label: '기본 보상 명칭',
      type: 'text',
      defaultValue: '아메리카노 1잔 무료 교환권',
      description: '판 완성 시 자동 발급되는 리워드 쿠폰 명칭입니다.',
      required: true,
    },
    {
      id: 'rewardCouponValidityDays',
      label: '발급 쿠폰 유효기간 (일)',
      type: 'number',
      defaultValue: 30,
      required: true,
    },
  ],
};
