import type { Json } from '@/lib/supabase/database.types';
import type { BathVisit, BathVisitMutationAction, BathVisitStatus } from '../types/visit';

export type BathVisitRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  check_in_at: string;
  check_out_at: string | null;
  status: BathVisitStatus;
  entry_product_id: string | null;
  pass_id: string | null;
  locker_id: string | null;
  room_reservation_id: string | null;
  staff_id: string | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type BathVisitRpcPayload = BathVisitRow & {
  action?: BathVisitMutationAction;
};

function optionalId(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return value;
}

export function rowToBathVisit(row: BathVisitRow): BathVisit {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    checkInAt: row.check_in_at,
    checkOutAt: optionalId(row.check_out_at),
    status: row.status,
    entryProductId: optionalId(row.entry_product_id),
    passId: optionalId(row.pass_id),
    lockerId: optionalId(row.locker_id),
    roomReservationId: optionalId(row.room_reservation_id),
    staffId: optionalId(row.staff_id),
    memo: row.memo || undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rpcPayloadToVisitResult(payload: BathVisitRpcPayload): {
  action: BathVisitMutationAction;
  visit: BathVisit;
} {
  return {
    action: payload.action || 'idempotent',
    visit: rowToBathVisit(payload),
  };
}
