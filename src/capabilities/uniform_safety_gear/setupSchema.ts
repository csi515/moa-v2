import type { CapabilitySetupSchema } from '@/core/presets/types';

export const uniformSafetyGearSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'uniform_safety_gear',
  title: '유니폼 및 보호구 관리 설정',
  description: '퇴사 시 미반납 유니폼 변상금 규정 및 정기 교체 주기를 설정합니다.',
  fields: [
    {
      id: 'unreturned_penalty_fee',
      label: '퇴사 시 유니폼 미반납 변상금(원)',
      type: 'number',
      defaultValue: 30000,
      description: '퇴직 정산 시 회수되지 않은 피복/안전화에 대해 부과하는 금액입니다.',
    },
    {
      id: 'default_gear_replacement_months',
      label: '안전보호구 정기 교체 주기(개월)',
      type: 'number',
      defaultValue: 6,
      description: '주방 안전화, 보호 안경 등의 노후 교체 권장 주기입니다.',
    },
  ],
};
