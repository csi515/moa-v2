import { defineCapability } from '../_shared/capabilityTypes';

export const waitlist_queueCapability = defineCapability({
  id: 'waitlist_queue',
  displayName: '시간표/수업 마감 취소 대기열 FIFO',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
