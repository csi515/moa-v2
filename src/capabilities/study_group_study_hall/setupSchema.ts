import type { CapabilitySetupSchema } from '@/core/presets/types';

export const studyGroupStudyHallSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'study_group_study_hall',
  title: '스터디 그룹 및 보증금 정책 설정',
  description: '스터디 그룹의 기본 최소 출석률 및 벌금 적립금 운영 방식을 설정합니다.',
  fields: [
    {
      id: 'default_min_attendance_rate',
      label: '기본 보증금 전액 환급 기준 출석률(%)',
      type: 'number',
      defaultValue: 80,
      description: '이 비율 이상 출석한 멤버에게 보증금을 100% 환급합니다.',
    },
    {
      id: 'penalty_allocation_rule',
      label: '벌금 배분 규칙',
      type: 'text',
      defaultValue: 'reward_diligent_members',
      description: '차감된 벌금을 우수 출석자에게 상금으로 지급하거나 시설 간식비로 전환합니다.',
    },
  ],
};
