import type { CapabilitySetupSchema } from '@/core/presets/types';

export const nps_survey_collectorSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'nps_survey_collector',
  title: '만족도 및 NPS 설문 설정',
  description: '설문 완료 보상 포인트 및 불만 고객 즉시 케어 알림 규칙을 설정합니다.',
  fields: [
    {
      id: 'defaultRewardPoints',
      type: 'number',
      label: '설문 완료 보상 포인트',
      description: '설문 응답을 완료한 고객에게 자동 지급할 적립금 포인트 (0 = 미지급)',
      defaultValue: 500,
      required: false,
    },
    {
      id: 'autoAlertDetractorToDirector',
      type: 'boolean',
      label: '불만 고객(0~6점) 등록 시 원장 긴급 알림',
      description: '추천 점수 6점 이하의 불만족 피드백 인입 시 대시보드 긴급 알림을 표시합니다.',
      defaultValue: true,
      required: false,
    },
    {
      id: 'allowAnonymousResponses',
      type: 'boolean',
      label: '익명 참여 허용',
      description: '고객이 원할 경우 이름을 밝히지 않고 솔직한 피드백을 남길 수 있도록 허용합니다.',
      defaultValue: true,
      required: false,
    },
  ],
};

export const npsSurveyCollectorSetupSchema = nps_survey_collectorSetupSchema;
