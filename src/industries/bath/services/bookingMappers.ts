import type { Json } from '@/lib/supabase/database.types';
import type { BathBooking, BathBookingKind, BathBookingStatus } from '../types/booking';

export type BathBookingRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  reservation_id: string;
  staff_reservation_id: string | null;
  service_id: string | null;
  resource_id: string;
  staff_id: string | null;
  room_id: string | null;
  kind: BathBookingKind;
  starts_at: string;
  ends_at: string;
  status: BathBookingStatus;
  memo: string | null;
  idempotency_key: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

function optionalId(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return value;
}

export function rowToBathBooking(row: BathBookingRow): BathBooking {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    reservationId: row.reservation_id,
    staffReservationId: optionalId(row.staff_reservation_id),
    serviceId: optionalId(row.service_id),
    resourceId: row.resource_id,
    staffId: optionalId(row.staff_id),
    roomId: optionalId(row.room_id),
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    memo: row.memo || undefined,
    idempotencyKey: row.idempotency_key,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
