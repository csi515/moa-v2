import type { CapabilitySetupSchema } from '@/core/presets/types';

export const shiftScheduleSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'shift_schedule',
  title: '직원 근무표 및 시급 정산 설정',
  description: '기본 시급, 주휴수당/야간수당 가산 배율 및 교대 근무 슬롯을 설정합니다.',
  fields: [
    {
      id: 'defaultHourlyWage',
      label: '기본 최저/적용 시급 (원)',
      type: 'number',
      defaultValue: 10030, // 2025/2026 기준
      required: true,
    },
    {
      id: 'nightAllowanceMultiplier',
      label: '야간 근무 가산 배율 (22시~06시)',
      type: 'number',
      defaultValue: 1.5,
      description: '근로기준법 기준 1.5배 (50% 가산)',
    },
    {
      id: 'defaultBreakMinutes',
      label: '4시간 이상 근무 시 기본 휴게시간 (분)',
      type: 'number',
      defaultValue: 30,
    },
    {
      id: 'shiftSlots',
      label: '교대 근무 시프트 슬롯 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['오픈 (09:00~14:00)', '미들 (14:00~19:00)', '마감 (19:00~24:00)'],
    },
  ],
};
