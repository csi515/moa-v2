import type { CapabilitySetupSchema } from '@/core/presets/types';

export const commissionPayrollSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'commission_payroll',
  title: '전문가 및 프리랜서 인센티브 요율 정산 설정',
  description: '매출 기여도 요율(%), 3.3% 원천징수 공제 및 카드 수수료 차감 정책을 설정합니다.',
  fields: [
    {
      id: 'defaultCommissionRate',
      label: '기본 인센티브 지급 요율 (%)',
      type: 'number',
      defaultValue: 50,
      required: true,
    },
    {
      id: 'enableFreelancerWithholdingTax',
      label: '3.3% 사업소득세 원천징수 자동 공제',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'cardFeeDeductionPercent',
      label: '카드 결제 시 수수료 공제율 (%)',
      type: 'number',
      defaultValue: 3,
    },
    {
      id: 'allowStaffRealtimeInquiry',
      label: '전문가/강사 개인 모바일 화면에서 당월 정산액 실시간 조회 허용',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'settlementClosingDay',
      label: '월 정산 마감일 (일)',
      type: 'number',
      defaultValue: 31,
    },
  ],
};
