import type { CapabilitySetupSchema } from '@/core/presets/types';

export const onboardingChecklistSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'onboarding_checklist',
  title: '신규 직원 온보딩 및 수습 평가 설정',
  description: '수습 평가 기간(월) 및 멘토 지정 필수 여부를 설정합니다.',
  fields: [
    {
      id: 'default_probation_months',
      label: '기본 수습 기간(개월)',
      type: 'number',
      defaultValue: 3,
      description: '채용 후 정규 임용 전까지의 수습 평가 기간입니다.',
    },
    {
      id: 'require_mentor_assignment',
      label: '신규 입사자 전담 멘토 지정 필수',
      type: 'boolean',
      defaultValue: true,
      description: '온보딩 태스크 등록 시 사수/멘토 직원 매핑을 필수로 강제합니다.',
    },
  ],
};
