import type { Json } from '@/lib/supabase/database.types';
import type {
  CustomerSession,
  CustomerSessionMutationAction,
  CustomerSessionMutationResult,
  CustomerSessionStatus,
} from './types';

export type CustomerSessionRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  started_at: string;
  ended_at: string | null;
  status: CustomerSessionStatus;
  source: string;
  context: string | null;
  staff_id: string | null;
  booking_id: string | null;
  reservation_id: string | null;
  pass_id: string | null;
  payment_id: string | null;
  resource_id: string | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  action?: string;
};

function optionalId(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return value;
}

export function rowToCustomerSession(row: CustomerSessionRow): CustomerSession {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    startedAt: row.started_at,
    endedAt: row.ended_at || undefined,
    status: row.status,
    source: row.source || 'walk_in',
    context: row.context || undefined,
    staffId: optionalId(row.staff_id),
    bookingId: optionalId(row.booking_id),
    reservationId: optionalId(row.reservation_id),
    passId: optionalId(row.pass_id),
    paymentId: optionalId(row.payment_id),
    resourceId: optionalId(row.resource_id),
    memo: row.memo || undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rpcPayloadToSessionResult(payload: CustomerSessionRow): CustomerSessionMutationResult {
  const action = (payload.action || 'created') as CustomerSessionMutationAction;
  return { action, session: rowToCustomerSession(payload) };
}
