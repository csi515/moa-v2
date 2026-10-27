import type { CapabilitySetupSchema } from '@/core/presets/types';

export const hazardousWasteLogSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'hazardous_waste_log',
  title: '유해/의료 폐기물 배출 규정 설정',
  description: '법정 최대 보관 기한(일) 및 전용 수거업체 계약 정보를 설정합니다.',
  fields: [
    {
      id: 'max_storage_days',
      label: '법정 최대 보관 기한(일)',
      type: 'number',
      defaultValue: 15,
      description: '폐기물관리법상 감염성/유해 폐기물 전용 용기 보관 제한 일수(일)입니다.',
    },
    {
      id: 'licensed_collector_name',
      label: '지정 위탁 수거업체명',
      type: 'text',
      defaultValue: '한국의료폐기물처리공사',
      description: '정기 수거 및 인계증(올바로시스템) 등록 대상 위탁 업체명입니다.',
    },
  ],
};
