import type { CapabilitySetupSchema } from '@/core/presets/types';

export const valetKeyCustodySetupSchema: CapabilitySetupSchema = {
  capabilityId: 'valet_key_custody',
  title: '발렛 및 차량 키 보관함 설정',
  description: '발렛 키 보관함 총 슬롯 수 및 기본 발렛 이용 요금을 설정합니다.',
  fields: [
    {
      id: 'total_key_slots',
      label: '키 보관함 총 슬롯 수',
      type: 'number',
      defaultValue: 30,
      description: '물리적 키 보관함에 구비된 슬롯의 총 개수입니다.',
    },
    {
      id: 'default_valet_fee',
      label: '기본 발렛 대행료(원)',
      type: 'number',
      defaultValue: 3000,
      description: '차량 입차 시 부과되는 기본 발렛 파킹 수수료입니다.',
    },
  ],
};
