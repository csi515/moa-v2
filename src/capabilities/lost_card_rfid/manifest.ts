import { defineCapability } from '../_shared/capabilityTypes';

export const lost_card_rfidCapability = defineCapability({
  id: 'lost_card_rfid',
  displayName: 'RF/NFC 출입카드 및 바코드 실물 발급 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
