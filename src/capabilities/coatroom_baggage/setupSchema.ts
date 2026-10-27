import type { CapabilitySetupSchema } from '@/core/presets/types';

export const coatroomBaggageSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'coatroom_baggage',
  title: '코트룸 및 수하물 보관 설정',
  description: '행거 총 개수 및 대형 수하물 보관 구역 설정을 관리합니다.',
  fields: [
    {
      id: 'total_hangers',
      label: '외투 행거 총 개수',
      type: 'number',
      defaultValue: 50,
      description: '매장에 비치된 의류 행거의 번호표 수량입니다.',
    },
    {
      id: 'enable_baggage_zone',
      label: '대형 수하물/캐리어 보관 구역 운영',
      type: 'boolean',
      defaultValue: true,
      description: '캐리어, 유모차 등 대형 짐 보관 접수를 허용합니다.',
    },
  ],
};
