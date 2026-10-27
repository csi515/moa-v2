import type { CapabilitySetupSchema } from '@/core/presets/types';

export const depositEscrowSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'deposit_escrow',
  title: '노쇼 방지 예약 보증금 에스크로 설정',
  description: '예약 보증금 예치, 현장 결제 시 자동 공제 및 취소 위약금 기준을 설정합니다.',
  fields: [
    {
      id: 'freeCancellationHours',
      label: '무료 취소 보증 시간(시간 전)',
      type: 'number',
      defaultValue: 24,
      description: '예약 일시 기준 몇 시간 전까지 취소 시 보증금을 100% 전액 환불하는지 설정합니다.',
    },
    {
      id: 'lateCancellationPenaltyRate',
      label: '기한 경과 취소 위약금 요율 (0.0~1.0)',
      type: 'number',
      defaultValue: 1.0,
      description: '무료 취소 기한 경과 또는 당일 노쇼 시 보증금 중 매장 위약금으로 몰수되는 비율입니다.',
    },
    {
      id: 'defaultDepositPercent',
      label: '기본 보증금 비율(%)',
      type: 'number',
      defaultValue: 30,
      description: '서비스 또는 대관 총액 대비 예약 시 선납받을 기본 보증금 퍼센트입니다.',
    },
  ],
};
