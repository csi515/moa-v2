import type { CapabilitySetupSchema } from '@/core/presets/types';

export const lockerSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'locker',
  title: '락커·사물함 정책 설정',
  description: '총 락커 개수와 구역 구분 및 보증금/월 이용료 규칙을 설정합니다.',
  fields: [
    {
      id: 'totalLockerCount',
      label: '총 락커 수량 (개)',
      type: 'number',
      defaultValue: 50,
      required: true,
    },
    {
      id: 'defaultMonthlyFee',
      label: '월 기본 이용료 (원)',
      type: 'number',
      defaultValue: 10000,
    },
    {
      id: 'defaultDepositAmount',
      label: '열쇠/비밀번호 보증금 (원)',
      type: 'number',
      defaultValue: 10000,
    },
    {
      id: 'sections',
      label: '락커 구역 구분 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['남성구역', '여성구역', '공용'],
    },
  ],
};
