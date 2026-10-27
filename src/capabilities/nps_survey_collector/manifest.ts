import { defineCapability } from '../_shared/capabilityTypes';

export const nps_survey_collectorCapability = defineCapability({
  id: 'nps_survey_collector',
  displayName: '모바일 만족도·NPS 설문 조사 및 피드백 분석기',
  dependencies: ['retention_marketing'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['marketing.manage'],
});

export const npsSurveyCollectorCapability = nps_survey_collectorCapability;
