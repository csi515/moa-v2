import type { CapabilitySetupSchema } from '@/core/presets/types';

export const space_turnaroundSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'space_turnaround',
  title: '공간 턴어라운드 및 정비 버퍼 설정',
  description: '공간 대여 종료 후 다음 예약 사이에 확보할 정비/환기 시간과 체크리스트를 설정합니다.',
  fields: [
    {
      id: 'default_buffer_minutes',
      label: '기본 정비/청소 버퍼 시간 (분)',
      type: 'number',
      defaultValue: 15,
      description: '예약 종료 후 다음 고객이 예약할 수 없는 자동 보호 버퍼 시간입니다.',
    },
    {
      id: 'require_cleaning_checklist',
      label: '정비 완료 전 다음 고객 입실 차단',
      type: 'boolean',
      defaultValue: true,
      description: '청소/정비가 완료 처리되기 전에는 다음 고객의 키오스크/현장 체크인을 차단합니다.',
    },
  ],
};
