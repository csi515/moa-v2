import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const digital_guestbookResources: CapabilityResourceDefinition = {
  capabilityId: 'digital_guestbook',
  resources: [
    {
      name: 'digital_guestbook_entries',
      list: '/digital-guestbook',
      create: '/digital-guestbook/create',
      show: '/digital-guestbook/:id',
      meta: {
        label: '전자 방명록',
        order: 215,
      },
    },
  ],
};

export const digitalGuestbookResources = digital_guestbookResources;
