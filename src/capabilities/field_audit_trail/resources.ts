import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const fieldAuditTrailResources: CapabilityResourceDefinition = {
  capabilityId: 'field_audit_trail',
  resources: [
    {
      name: 'audit_trails',
      list: '/audit-trails',
      meta: {
        label: '데이터 변경 감사 추적',
        icon: 'ShieldAlert',
        order: 165,
      },
    },
  ],
};
