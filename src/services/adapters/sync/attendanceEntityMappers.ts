import type { Json } from '@/lib/supabase/database.types';
import type { AttendanceSession, CheckInMethod } from '@/core/attendance/types';

type DbCheckInMethod = 'pin' | 'qr' | 'nfc' | 'kiosk' | 'manual';

export function sessionToCoreRow(session: AttendanceSession, organizationId: string) {
  return {
    id: session.id,
    organization_id: organizationId,
    customer_id: session.customerId,
    session_date: session.sessionDate,
    check_in_at: session.checkInAt || null,
    check_out_at: session.checkOutAt || null,
    check_in_method: (session.checkInMethod as DbCheckInMethod) || null,
    check_out_method: (session.checkOutMethod as DbCheckInMethod) || null,
    memo: session.memo || null,
    metadata: { customerName: session.customerName } as Json,
  };
}

export function coreRowToSession(row: {
  id: string;
  customer_id: string;
  session_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_method: DbCheckInMethod | null;
  check_out_method: DbCheckInMethod | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): AttendanceSession {
  const meta = (row.metadata || {}) as { customerName?: string };
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: meta.customerName || '',
    sessionDate: row.session_date,
    checkInAt: row.check_in_at || undefined,
    checkOutAt: row.check_out_at || undefined,
    checkInMethod: (row.check_in_method as CheckInMethod) || undefined,
    checkOutMethod: (row.check_out_method as CheckInMethod) || undefined,
    memo: row.memo || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CustomerPinRow {
  id: string;
  check_in_pin_hash: string | null;
}

export function pinRowsFromCustomers(rows: CustomerPinRow[]): { customerId: string; pinHash: string }[] {
  return rows
    .filter((r) => r.check_in_pin_hash)
    .map((r) => ({ customerId: r.id, pinHash: r.check_in_pin_hash! }));
}
