import type { CapabilitySetupSchema } from '@/core/presets/types';

export const membershipReferralTreeSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'membership_referral_tree',
  title: '패밀리 연동 및 추천인 리워드 설정',
  description: '형제/자매 결합 할인율, 가족 공용 크레딧 공유 및 추천 보너스를 구성합니다.',
  fields: [
    {
      id: 'enable_sibling_discount',
      label: '형제/자매 결합 할인 자동 적용',
      type: 'boolean',
      defaultValue: true,
      description: '동일 가구 2인 이상 재원 시 수강료를 자동 감면합니다.',
    },
    {
      id: 'sibling_discount_rate_2p',
      label: '2인 동시 수강 시 감면율 (%)',
      type: 'number',
      defaultValue: 10,
      description: '형제 2인 동시 재원 시 기본 적용되는 할인율입니다.',
    },
    {
      id: 'sibling_discount_rate_3p',
      label: '3인 이상 수강 시 감면율 (%)',
      type: 'number',
      defaultValue: 15,
      description: '형제 3인 이상 동시 재원 시 우대 적용되는 할인율입니다.',
    },
    {
      id: 'referral_reward_credit',
      label: '지인 추천인 1인당 지급 보너스 크레딧 (원)',
      type: 'number',
      defaultValue: 30000,
      description: '신규 회원을 소개한 기존 회원에게 적립되는 보너스 포인트입니다.',
    },
  ],
};
