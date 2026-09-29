import type { EnqueueOutboxInput } from './types';

/** payload에 조직/지점 context를 항상 포함한다. */
export function withOutboxContext(
  input: EnqueueOutboxInput
): Record<string, unknown> {
  return {
    ...(input.payload ?? {}),
    organizationId: input.organizationId,
    locationId: input.locationId ?? null,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
  };
}

export function reservationConfirmedPayload(input: {
  organizationId: string;
  reservationId: string;
  scheduleId: string;
  locationId?: string | null;
}): Record<string, unknown> {
  return withOutboxContext({
    organizationId: input.organizationId,
    locationId: input.locationId,
    aggregateType: 'reservation',
    aggregateId: input.reservationId,
    eventType: 'reservation.confirmed',
    payload: {
      reservationId: input.reservationId,
      scheduleId: input.scheduleId,
    },
  });
}
