import type { CapabilitySetupSchema } from '@/core/presets/types';

export const mentorMenteeMatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'mentor_mentee_match',
  title: '멘토링 프로그램 및 포상 설정',
  description: '멘토링 완료 기준 세션 수 및 멘토 장학 포인트 지급 기준 평점을 설정합니다.',
  fields: [
    {
      id: 'default_target_sessions',
      label: '표준 멘토링 목표 세션 수(회)',
      type: 'number',
      defaultValue: 8,
      description: '한 기수당 진행할 정기 멘토링 세션 횟수입니다.',
    },
    {
      id: 'min_satisfaction_rating',
      label: '우수 멘토 장학금 지급 기준 평점(5점 만점)',
      type: 'number',
      defaultValue: 4.5,
      description: '멘티 만족도 평점이 이 기준 이상일 때 멘토 장학 혜택을 승인합니다.',
    },
  ],
};
