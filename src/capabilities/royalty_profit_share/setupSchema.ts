import type { CapabilitySetupSchema } from '@/core/presets/types';

export const royaltyProfitShareSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'royalty_profit_share',
  title: '동업자 손익 안분 및 유보금 설정',
  description: '월간 순이익 배당 전 비상 예비비(유보금) 적립 비율(%)을 설정합니다.',
  fields: [
    {
      id: 'default_reserve_fund_percent',
      label: '사업장 비상 유보금 적립률 (%)',
      type: 'number',
      defaultValue: 10,
      description: '순이익에서 파트너 배당 전 사업장 운영 금고에 유보하는 비율입니다.',
    },
    {
      id: 'require_partner_consensus',
      label: '배당 확정 시 전 파트너 확인 서약 필수',
      type: 'boolean',
      defaultValue: true,
      description: '월간 손익 배당 명세서에 동업자 전원의 전자 확인 서약을 요구합니다.',
    },
  ],
};
