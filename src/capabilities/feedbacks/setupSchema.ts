import type { CapabilitySetupSchema } from '@/core/presets/types';

export const feedbacksSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'feedbacks',
  title: '현장 소통 및 인수인계 설정',
  description: '오전/오후 교대 근무 인수인계 항목 및 현장 고객 건의함 설정',
  fields: [
    {
      id: 'enable_customer_voc',
      label: '고객 VOC 익명 접수 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '고객 포털에서 매장 개선 건의를 익명으로 접수할 수 있습니다.',
    },
    {
      id: 'require_handover_signature',
      label: '교대 인수인계 필수 서명',
      type: 'boolean',
      defaultValue: true,
      description: '다음 근무자의 인수인계 확인 서명을 필수로 강제합니다.',
    },
  ],
};
