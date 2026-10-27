import { defineCapability } from '../_shared/capabilityTypes';

export const custom_order_craftCapability = defineCapability({
  id: 'custom_order_craft',
  displayName: '주문 제작 맞춤 사양서 및 단계별 공정 트래커',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
