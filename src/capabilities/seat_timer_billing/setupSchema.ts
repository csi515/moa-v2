import type { CapabilitySetupSchema } from '@/core/presets/types';

export const seatTimerBillingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'seat_timer_billing',
  title: '시간제 공간 타이머 & 초과 요금 자동 과금 설정',
  description: '기본 이용시간, 시간당 기본요율 및 10분 단위 초과 할증 요금을 설정합니다.',
  fields: [
    {
      id: 'defaultBaseRatePerHour',
      label: '시간당 기본 이용요금 (원)',
      type: 'number',
      defaultValue: 3000,
      required: true,
    },
    {
      id: 'overdueRatePer10Min',
      label: '이용시간 초과 시 10분당 할증 요금 (원)',
      type: 'number',
      defaultValue: 1000,
      required: true,
      description: '부여된 이용시간 경과 시 10분 단위로 자동 누적 과금됩니다.',
    },
    {
      id: 'autoSwitchCleaningOnCheckout',
      label: '퇴실 시 즉시 청소/소독 대기 상태로 자동 전환',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
