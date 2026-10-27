import type { CapabilitySetupSchema } from '@/core/presets/types';

export const ledgerSimpleSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'ledger_simple',
  title: '간이 수기 장부 및 일일 시재 설정',
  description: '매장 기초 시재금(거스름돈 준비금), 취급 결제수단 및 일일 마감 잠금 정책을 설정합니다.',
  fields: [
    {
      id: 'defaultOpeningCash',
      label: '매장 기초 시재 준비금 (원)',
      type: 'number',
      defaultValue: 100000,
      required: true,
    },
    {
      id: 'acceptedPaymentMethods',
      label: '취급 결제 수단',
      type: 'tags',
      defaultValue: ['현금', '계좌이체', '카드단말기'],
      required: true,
    },
    {
      id: 'allowVarianceClosing',
      label: '시재 오차 발생 시에도 마감 승인 허용',
      type: 'boolean',
      defaultValue: true,
      description: '오차 금액과 사유를 기록한 뒤 마감을 확정합니다.',
    },
    {
      id: 'closingCutoffTime',
      label: '일일 시재 마감 기준 시각',
      type: 'time',
      defaultValue: '23:00',
    },
  ],
};
