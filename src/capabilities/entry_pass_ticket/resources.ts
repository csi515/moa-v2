import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const entry_pass_ticketResources: CapabilityResourceDefinition = {
  capabilityId: 'entry_pass_ticket',
  resources: [
    {
      name: 'entry_pass_tickets',
      list: '/entry-pass-ticket/tickets',
      show: '/entry-pass-ticket/tickets/:id',
      meta: {
        label: '일일 티켓 발권',
        order: 210,
      },
    },
    {
      name: 'entry_pass_scans',
      list: '/entry-pass-ticket/scans',
      meta: {
        label: '현장 검표 기록',
        order: 211,
      },
    },
  ],
};

export const entryPassTicketResources = entry_pass_ticketResources;
