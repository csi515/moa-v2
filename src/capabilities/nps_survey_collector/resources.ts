import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const nps_survey_collectorResources: CapabilityResourceDefinition = {
  capabilityId: 'nps_survey_collector',
  resources: [
    {
      name: 'nps_survey_campaigns',
      list: '/nps-surveys',
      create: '/nps-surveys/create',
      show: '/nps-surveys/:id',
      meta: {
        label: '만족도·NPS 설문',
        order: 211,
      },
    },
  ],
};

export const npsSurveyCollectorResources = nps_survey_collectorResources;
