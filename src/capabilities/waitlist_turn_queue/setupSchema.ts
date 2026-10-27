import type { CapabilitySetupSchema } from '@/core/presets/types';

export const waitlistTurnQueueSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'waitlist_turn_queue',
  title: '현장 순번 대기 & DID 호출 설정',
  description: '입구 태블릿 발권 및 매장 전광판 호출 기준을 설정합니다.',
  fields: [
    {
      id: 'avgMinutesPerParty',
      label: '팀당 평균 대기 시간(분)',
      type: 'number',
      defaultValue: 8,
      description: '대기 팀 수에 따라 현장 예상 시간을 산출하는 기준 시간입니다.',
    },
    {
      id: 'roomBonusMinutes',
      label: '개별 룸 선호 추가 시간(분)',
      type: 'number',
      defaultValue: 12,
      description: '룸 좌석을 선택한 팀에게 추가로 가산되는 예상 소요분입니다.',
    },
    {
      id: 'autoExpireCallMinutes',
      label: '호출 후 미입장 시 자동 취소(분)',
      type: 'number',
      defaultValue: 10,
      description: '고객 호출 후 현장 카운터로 방문하지 않을 시 노쇼 자동 경고 기준 시간입니다.',
    },
  ],
};
