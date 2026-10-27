import { defineCapability } from '../_shared/capabilityTypes';

export const digital_guestbookCapability = defineCapability({
  id: 'digital_guestbook',
  displayName: '오프라인 내방객 전자 방명록 & 마케팅 동의기',
  dependencies: ['consultation_crm'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['consultation.manage'],
});

export const digitalGuestbookCapability = digital_guestbookCapability;
