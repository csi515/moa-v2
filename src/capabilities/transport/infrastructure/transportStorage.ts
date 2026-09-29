import { createShuttleRideStorage } from '@/services/storage/shuttleRideStorage';

/** Transport persistence facade. 기존 shuttle factory를 연결한다. */
export function createTransportCapabilityStorage() {
  return createShuttleRideStorage();
}

export type TransportCapabilityStorage = ReturnType<typeof createTransportCapabilityStorage>;

/** Transport persist SoT. */
export const transportStorage = createTransportCapabilityStorage();
