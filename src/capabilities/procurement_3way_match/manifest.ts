import { defineCapability } from '../_shared/capabilityTypes';

export const procurement_3way_matchCapability = defineCapability({
  id: 'procurement_3way_match',
  displayName: '3-Way 구매요청·발주·입고검수 매칭 트래커',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
