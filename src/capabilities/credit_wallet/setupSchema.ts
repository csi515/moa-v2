import type { CapabilitySetupSchema } from '@/core/presets/types';

export const creditWalletSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'credit_wallet',
  title: '선불 충전금 및 마일리지 설정',
  description: '최소 충전 단위, 충전 보너스 프로모션 구간표 및 포인트 소멸 정책을 설정합니다.',
  fields: [
    {
      id: 'minChargeAmount',
      label: '최소 1회 충전 금액 (원)',
      type: 'number',
      defaultValue: 10000,
      required: true,
    },
    {
      id: 'enableBonusTiers',
      label: '금액대별 추가 보너스 적립 활성화',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'expiryMonths',
      label: '적립 보너스 포인트 유효기간 (개월)',
      type: 'number',
      defaultValue: 12,
    },
    {
      id: 'allowNegativeBalance',
      label: '외상/마이너스 잔액 허용 여부',
      type: 'boolean',
      defaultValue: false,
      description: '보안을 위해 잔액 음수 방어가 기본 활성화됩니다.',
    },
  ],
};
