import type { CapabilitySetupSchema } from '@/core/presets/types';

export const lockerEmergencyOverrideSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'locker_emergency_override',
  title: '사물함 비상 개방 보안 정책 설정',
  description: '사물함 강제 개방 시 필수 입회인 수 및 소지품 봉인 보관 기한을 설정합니다.',
  fields: [
    {
      id: 'require_dual_witness',
      label: '직원 2인 이상 필수 입회 여부',
      type: 'boolean',
      defaultValue: true,
      description: '사물함 강제 개방 시 책임자 1인 외 입회인 1인의 교차 서약을 강제합니다.',
    },
    {
      id: 'seized_retention_days',
      label: '압류 소지품 보관 기한(일)',
      type: 'number',
      defaultValue: 30,
      description: '장기 미반납 사물함 개방 후 수거한 유류품의 임시 보관 기한입니다.',
    },
  ],
};
