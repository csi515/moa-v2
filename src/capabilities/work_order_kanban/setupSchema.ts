import type { CapabilitySetupSchema } from '@/core/presets/types';

export const workOrderKanbanSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'work_order_kanban',
  title: '정비·수리 단계별 작업지시서 & 부품 공임 견적서 설정',
  description: '부품 투입 시 재고 자동 차감 여부, 기본 시간당 공임 요율 및 부가세(10%) 적용 여부를 설정합니다.',
  fields: [
    {
      id: 'defaultLaborRatePerHour',
      label: '시간당 기본 기술 공임 단가 (원)',
      type: 'number',
      defaultValue: 60000,
      required: true,
    },
    {
      id: 'applyVat10Percent',
      label: '견적서/청구서 부가세(10%) 자동 합산',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'autoDeductUsedPartsFromInventory',
      label: '작업 완료 시 사용 부품 재고 자동 감량',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
