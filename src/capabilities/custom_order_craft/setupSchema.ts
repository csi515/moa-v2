import type { CapabilitySetupSchema } from '@/core/presets/types';

export const customOrderCraftSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'custom_order_craft',
  title: '주문 제작 공방 공정 설정',
  description: '맞춤 케이크, 가죽공예, 가구 등 제작 리드타임(일) 및 계약금 비율을 설정합니다.',
  fields: [
    {
      id: 'default_lead_time_days',
      label: '표준 제작 리드타임(일)',
      type: 'number',
      defaultValue: 7,
      description: '주문 접수 후 고객 수령일까지 소요되는 기본 공정 일수입니다.',
    },
    {
      id: 'down_payment_rate_percent',
      label: '착수 계약금 비율 (%)',
      type: 'number',
      defaultValue: 50,
      description: '맞춤 제작 착수 전 고객이 선결제해야 하는 최소 계약금 비율입니다.',
    },
  ],
};
