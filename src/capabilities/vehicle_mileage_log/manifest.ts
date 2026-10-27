import { defineCapability } from '../_shared/capabilityTypes';

export const vehicle_mileage_logCapability = defineCapability({
  id: 'vehicle_mileage_log',
  displayName: '업무용 승용차 운행기록부 및 유류비 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});

export const vehicleMileageLogCapability = vehicle_mileage_logCapability;
