import { defineCapability } from '../_shared/capabilityTypes';

export const parking_validatorCapability = defineCapability({
  id: 'parking_validator',
  displayName: '고객 무료 주차 등록 & 상가 주차권 정산기',
  dependencies: ['seat_room'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['resources.manage'],
});

export const parkingValidatorCapability = parking_validatorCapability;
