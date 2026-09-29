import type { Json } from '@/lib/supabase/database.types';
import { displayPositionOf } from './transitions';
import type {
  WaitlistEntry,
  WaitlistMutationAction,
  WaitlistMutationResult,
  WaitlistStatus,
} from './types';

export type WaitlistEntryRow = {
  id: string;
  organization_id: string;
  target_type: string;
  target_id: string;
  customer_id: string;
  schedule_id: string | null;
  requested_time: string | null;
  status: WaitlistStatus;
  position: number;
  joined_at: string;
  notified_at: string | null;
  assigned_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  booking_id: string | null;
  reservation_id: string | null;
  notification_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  action?: string;
};

function optionalId(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return value;
}

export function rowToWaitlistEntry(row: WaitlistEntryRow): WaitlistEntry {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    targetType: row.target_type,
    targetId: row.target_id,
    customerId: row.customer_id,
    scheduleId: optionalId(row.schedule_id),
    requestedTime: row.requested_time || undefined,
    status: row.status,
    position: row.position,
    joinedAt: row.joined_at,
    notifiedAt: row.notified_at || undefined,
    assignedAt: row.assigned_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
    expiredAt: row.expired_at || undefined,
    bookingId: optionalId(row.booking_id),
    reservationId: optionalId(row.reservation_id),
    notificationId: optionalId(row.notification_id),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function withDisplayPositions(entries: WaitlistEntry[]): WaitlistEntry[] {
  return entries.map((entry) => ({
    ...entry,
    displayPosition: displayPositionOf(entries, entry.id) ?? undefined,
  }));
}

export function rpcPayloadToWaitlistResult(payload: WaitlistEntryRow): WaitlistMutationResult {
  const action = (payload.action || 'created') as WaitlistMutationAction;
  return { action, entry: rowToWaitlistEntry(payload) };
}
