import type { CapabilitySetupSchema } from '@/core/presets/types';

export const inventorySetupSchema: CapabilitySetupSchema = {
  capabilityId: 'inventory',
  title: '재고 및 자재 관리 설정',
  description: '품목 분류 방식과 안전 재고 알림 임계값을 설정합니다.',
  fields: [
    {
      id: 'enableSafetyStockAlert',
      label: '안전재고 부족 경고 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '설정 수량 이하로 떨어질 시 마감 대시보드에 알림을 표시합니다.',
    },
    {
      id: 'defaultSafetyStockCount',
      label: '기본 안전 재고 수량 (개)',
      type: 'number',
      defaultValue: 5,
    },
    {
      id: 'trackCostPrice',
      label: '입고 원가/매입가 추적',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'categories',
      label: '재고 분류 카테고리 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['소모품', '판매상품', '교재/비품'],
    },
  ],
};
