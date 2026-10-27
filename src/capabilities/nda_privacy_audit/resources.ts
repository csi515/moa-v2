import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const ndaPrivacyAuditResources: CapabilityResourceDefinition = {
  capabilityId: 'nda_privacy_audit',
  resources: [
    {
      name: 'privacy_audit_logs',
      list: '/privacy-audits',
      meta: {
        label: '개인정보 열람 감사 대장',
        icon: 'Lock',
        order: 139,
      },
    },
  ],
};
