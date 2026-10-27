import type { CapabilitySetupSchema } from '@/core/presets/types';

export const tableOrderKdsSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'table_order_kds',
  title: '테이블 QR 주문 및 주방 디스플레이(KDS) 설정',
  description: '테이블별 비대면 QR 주문 및 주방 3단계 조리 공정 상태머신을 구성합니다.',
  fields: [
    {
      id: 'targetCookingMinutes',
      label: '목표 조리 완료 시간 (분)',
      type: 'number',
      defaultValue: 15,
      required: true,
    },
    {
      id: 'enableOrderChime',
      label: '신규 주문 접수 시 알림음 재생',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'allowCustomerOrderCancel',
      label: '고객의 조리 전 주문 취소 허용',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'kitchenStations',
      label: '주방 파트 구분 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['전체', '음료/바', '조리/핫', '베이커리/디저트'],
    },
  ],
};
