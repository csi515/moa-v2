import { defineCapability } from '../_shared/capabilityTypes';

export const event_contest_hubCapability = defineCapability({
  id: 'event_contest_hub',
  displayName: '원내 발표회·대회 참가 접수 및 큐시트/심사 엔진',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['roster.view', 'consultation.manage'],
});

export const eventContestHubManifest = event_contest_hubCapability;
