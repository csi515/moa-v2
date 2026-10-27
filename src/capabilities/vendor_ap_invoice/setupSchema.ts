import type { CapabilitySetupSchema } from '@/core/presets/types';

export const vendorApInvoiceSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'vendor_ap_invoice',
  title: '공급처 원장 및 매입 세무 전표 설정',
  description: 'B2B 매입처 거래 조건, 납품 단가 급등 감지율 및 부가세 매입세액 공제 설정을 관리합니다.',
  fields: [
    {
      id: 'price_surge_threshold_percent',
      label: '입고 단가 급등 감지 임계율 (%)',
      type: 'number',
      defaultValue: 10,
      description: '직전 입고 단가 대비 이 비율 이상 상승 시 발주/입고 전표에서 원가 급등 경고를 표시합니다.',
    },
    {
      id: 'default_payment_term',
      label: '기본 매입 대금 결제 조건',
      type: 'select',
      defaultValue: 'end_of_next_month',
      options: [
        { label: '당일 현금/즉시 결제 (COD)', value: 'cash_on_delivery' },
        { label: '입고 후 15일 이내 (Net 15)', value: 'net_15' },
        { label: '당월 말일 결제', value: 'end_of_month' },
        { label: '익월 말일 결제 (기본)', value: 'end_of_next_month' },
      ],
      description: '신규 거래처 등록 시 적용할 기본 외상 결제 기한입니다.',
    },
    {
      id: 'enable_ap_aging_alert',
      label: '외상 매입금 연체 알림 표시',
      type: 'boolean',
      defaultValue: true,
      description: '결제 만기일이 지난 미지급 외상 매입금이 있을 때 데스크 대시보드에 경고를 표출합니다.',
    },
  ],
};
