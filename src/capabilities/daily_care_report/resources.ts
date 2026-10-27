import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const daily_care_reportResources: CapabilityResourceDefinition = {
  capabilityId: 'daily_care_report',
  resources: [
    {
      name: 'daily_care_logs',
      list: '/daily-care-report/logs',
      show: '/daily-care-report/logs/:id',
      meta: {
        label: '일일 알림장 작성',
        order: 200,
      },
    },
    {
      name: 'care_timeline_entries',
      list: '/daily-care-report/timeline',
      meta: {
        label: '활동 타임라인',
        order: 201,
      },
    },
  ],
};

export const dailyCareReportResources = daily_care_reportResources;
