import type { CapabilitySetupSchema } from '@/core/presets/types';

export const bookingSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'booking',
  title: '예약 슬롯 및 정원 설정',
  description: '시간대별 정원 제한 및 대기자 관리 규칙을 설정합니다.',
  fields: [
    {
      id: 'slotIntervalMinutes',
      label: '예약 시간 간격 (분)',
      type: 'number',
      defaultValue: 60,
      options: [
        { label: '30분 단위', value: 30 },
        { label: '60분 단위', value: 60 },
        { label: '90분 단위', value: 90 },
      ],
      required: true,
    },
    {
      id: 'maxCapacityPerSlot',
      label: '슬롯당 최대 정원 (명)',
      type: 'number',
      defaultValue: 1,
      required: true,
    },
    {
      id: 'allowWaitlist',
      label: '정원 초과 시 대기 접수 허용',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'cancellationLeadHours',
      label: '취소 가능 최소 시간 (시간 전)',
      type: 'number',
      defaultValue: 2,
    },
  ],
};
