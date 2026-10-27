import { defineCapability } from '../_shared/capabilityTypes';

export const entry_pass_ticketCapability = defineCapability({
  id: 'entry_pass_ticket',
  displayName: '모바일 일일 입장권 & 0원 W3C SVG QR 티켓 검표기',
  dependencies: ['seat_room'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['passes.manage', 'attendance.view'],
});

export const entryPassTicketManifest = entry_pass_ticketCapability;
