import { defineCapability } from '../_shared/capabilityTypes';

export const learning_journalCapability = defineCapability({
  id: 'learning_journal',
  displayName: '수업 일지 및 성장 알림장',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
