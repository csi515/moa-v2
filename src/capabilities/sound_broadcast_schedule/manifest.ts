import { defineCapability } from '../_shared/capabilityTypes';

export const sound_broadcast_scheduleCapability = defineCapability({
  id: 'sound_broadcast_schedule',
  displayName: '원내 시보·안내방송 타임테이블 스케줄러',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
