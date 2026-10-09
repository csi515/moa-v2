import type { CapabilitySetupSchema } from '@/core/presets/types';

export const billingInvoicingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'billing_invoicing',
  title: '정기 청구 및 수납 원장 설정',
  description: '매월 정기 청구일, 납부 마감 기한 및 수납 계좌 정보를 설정합니다.',
  fields: [
    {
      id: 'defaultBillingDay',
      label: '매월 정기 청구 기준일 (일)',
      type: 'number',
      defaultValue: 25,
      required: true,
    },
    {
      id: 'gracePeriodDays',
      label: '납부 유예/마감 기한 (청구일로부터 N일)',
      type: 'number',
      defaultValue: 7,
      required: true,
    },
    {
      id: 'bankName',
      label: '수납 입금 은행명',
      type: 'text',
      defaultValue: '토스뱅크',
      placeholder: '예: 국민은행, 신한은행, 토스뱅크',
      required: true,
    },
    {
      id: 'accountNumber',
      label: '수납 입금 계좌번호',
      type: 'text',
      defaultValue: '',
      placeholder: '숫자와 하이픈(-) 입력',
      required: true,
    },
    {
      id: 'accountHolder',
      label: '예금주 성명/상호',
      type: 'text',
      defaultValue: '',
      required: true,
    },
  ],
};
