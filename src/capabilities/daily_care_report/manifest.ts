import { defineCapability } from '../_shared/capabilityTypes';

export const daily_care_reportCapability = defineCapability({
  id: 'daily_care_report',
  displayName: '돌봄/활동 일일 알림장 & 타임라인 피드',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['roster.view', 'attendance.view'],
});

export const dailyCareReportManifest = daily_care_reportCapability;
