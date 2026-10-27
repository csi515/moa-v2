import type { CapabilitySetupSchema } from '@/core/presets/types';

export const prepaidTaxWithholdingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'prepaid_tax_withholding',
  title: '원천징수 사업소득세율 설정',
  description: '프리랜서 계약 강사 사업소득세(3.0%) 및 지방소득세(0.3%) 원천세율을 설정합니다.',
  fields: [
    {
      id: 'income_tax_rate',
      label: '소득세율 (%)',
      type: 'number',
      defaultValue: 3.0,
      description: '소득세법상 사업소득 기본 원천징수 세율(%)입니다.',
    },
    {
      id: 'local_tax_rate',
      label: '지방소득세율 (%)',
      type: 'number',
      defaultValue: 0.3,
      description: '소득세의 10%에 해당하는 지방소득세율(%)입니다.',
    },
  ],
};
