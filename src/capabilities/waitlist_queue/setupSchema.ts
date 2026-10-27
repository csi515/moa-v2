import type { CapabilitySetupSchema } from '@/core/presets/types';

export const waitlistQueueSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'waitlist_queue',
  title: '시간표/수업 마감 취소 대기열 설정',
  description: '취소 공석 발생 시 선착순 제안 발송 및 유효 대기 시간 만료 정책을 설정합니다.',
  fields: [
    {
      id: 'default_offer_timeout_minutes',
      label: '대기 제안 유효 시간 (분)',
      type: 'number',
      defaultValue: 30,
      description: '취소 공석 제안 발송 후 수락하지 않을 경우 다음 순번으로 넘어갈 때까지의 시간입니다.',
    },
    {
      id: 'auto_offer_next_candidate',
      label: '만료 시 다음 순번 자동 제안',
      type: 'boolean',
      defaultValue: true,
      description: '제안 시간이 만료되면 FIFO 대기열의 다음 대기자에게 순차적으로 제안합니다.',
    },
    {
      id: 'max_waitlist_per_slot',
      label: '슬롯당 최대 대기 허용 인원',
      type: 'number',
      defaultValue: 10,
      description: '한 시간표 슬롯에 등록 가능한 최대 대기자 정원입니다.',
    },
  ],
};
