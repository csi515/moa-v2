import type { CapabilitySetupSchema } from '@/core/presets/types';

export const procurement3WayMatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'procurement_3way_match',
  title: '구매 3-Way 매칭 및 입고 통제 설정',
  description: '구매요청-발주-입고검수 간 수량/단가 허용 오차 한도를 설정합니다.',
  fields: [
    {
      id: 'allow_partial_receipt',
      label: '분할 입고 허용 여부',
      type: 'boolean',
      defaultValue: true,
      description: '발주 수량보다 적게 입고되었을 때 부분 입고 검수를 허용합니다.',
    },
    {
      id: 'price_tolerance_percent',
      label: '단가 변동 허용 오차율 (%)',
      type: 'number',
      defaultValue: 0,
      description: '발주 단가와 청구 단가의 차이가 이 비율을 초과하면 자동 불일치(Discrepancy)로 잠급니다.',
    },
  ],
};
