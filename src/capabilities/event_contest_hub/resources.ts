import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const event_contest_hubResources: CapabilityResourceDefinition = {
  capabilityId: 'event_contest_hub',
  resources: [
    {
      name: 'event_contests',
      list: '/event-contest-hub/contests',
      show: '/event-contest-hub/contests/:id',
      meta: {
        label: '발표회·대회 관리',
        order: 215,
      },
    },
    {
      name: 'event_contest_entries',
      list: '/event-contest-hub/entries',
      meta: {
        label: '참가 접수 및 큐시트',
        order: 216,
      },
    },
  ],
};

export const eventContestHubResources = event_contest_hubResources;
