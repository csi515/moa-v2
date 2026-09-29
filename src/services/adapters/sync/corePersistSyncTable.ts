import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/supabase/database.types';
import type { PersistAbortGuard } from './syncTypes';
import { upsertThenDiffDelete } from './persistHelpers';

export type CoreClient = SupabaseClient<Database, 'core'>;

/** Core org 테이블 upsert 후 id diff-delete. false면 soft-fail(outbox 유지). */
export async function syncTable(
  client: CoreClient,
  table:
    | 'staff'
    | 'customers'
    | 'services'
    | 'schedules'
    | 'payments'
    | 'payment_transactions'
    | 'expenses'
    | 'income_entries'
    | 'teacher_payroll_settlements'
    | 'consultations'
    | 'notifications'
    | 'attendance_sessions'
    | 'session_passes',
  orgId: string,
  currentIds: string[],
  upsertAll: () => Promise<boolean>,
  options: { cachePresent: boolean; context: string; isAborted?: PersistAbortGuard }
): Promise<boolean> {
  return upsertThenDiffDelete({
    context: options.context,
    cachePresent: options.cachePresent,
    currentIds,
    isAborted: options.isAborted,
    upsertAll,
    fetchRemoteIds: async () => {
      const { data: existing, error } = await client
        .from(table)
        .select('id')
        .eq('organization_id', orgId);
      return { ids: (existing || []).map((r) => r.id), error };
    },
    deleteIds: async (ids) => {
      const { error } = await client.from(table).delete().in('id', ids);
      return { error };
    },
  });
}
