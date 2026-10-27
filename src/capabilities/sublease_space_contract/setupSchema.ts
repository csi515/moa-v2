import type { CapabilitySetupSchema } from '@/core/presets/types';

export const subleaseSpaceContractSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'sublease_space_contract',
  title: '샵인샵 전대차 계약 설정',
  description: '매장 내 샵인샵 입점 전대료 정산일 및 공과금 분할 방식을 설정합니다.',
  fields: [
    {
      id: 'default_settlement_day',
      label: '매월 정산 기준일',
      type: 'number',
      defaultValue: 10,
      description: '전월 입점 매장 매출에 대한 수수료 정산 및 세금계산서 발행 기준일입니다.',
    },
    {
      id: 'utility_split_mode',
      label: '공과금 분할 방식',
      type: 'select',
      defaultValue: 'FIXED_AMOUNT',
      options: [
        { label: '고정 관리비 부과', value: 'FIXED_AMOUNT' },
        { label: '면적 비율 분할', value: 'AREA_RATIO' },
      ],
      description: '전기/수도 등 공용 관리비 분할 정책입니다.',
    },
  ],
};
