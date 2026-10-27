import { defineCapability } from '../_shared/capabilityTypes';

export const emergency_alert_broadcastCapability = defineCapability({
  id: 'emergency_alert_broadcast',
  displayName: '긴급 휴원·재난 공지 & 모바일 수신확인 대장',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['safety.manage', 'communication.manage'],
});

export const emergencyAlertBroadcastCapability = emergency_alert_broadcastCapability;
