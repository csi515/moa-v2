import type { CapabilitySetupSchema } from '@/core/presets/types';

export const energyUtilityMeterSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'energy_utility_meter',
  title: '공과금 계량기 및 단가 설정',
  description: '전기(kWh) 및 수도(m³) 기본 단가와 공용 관리비 안분 방식을 설정합니다.',
  fields: [
    {
      id: 'electricity_unit_price',
      label: '전기 단위 단가(원/kWh)',
      type: 'number',
      defaultValue: 150,
      description: '검침 지침 차감량에 곱해지는 일반용 전기 단가(원)입니다.',
    },
    {
      id: 'water_unit_price',
      label: '수도 단위 단가(원/m³)',
      type: 'number',
      defaultValue: 1200,
      description: '검침 지침 차감량에 곱해지는 상하수도 단가(원)입니다.',
    },
  ],
};
