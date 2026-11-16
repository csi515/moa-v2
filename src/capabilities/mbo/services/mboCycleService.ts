import { getCoreClient } from '@/lib/supabase';
import {
  DEFAULT_MBO_CYCLE,
  normalizeCycleSettings,
  type MboCycleSettings,
} from '../domain/mboCycle';

type CycleRow = {
  organization_id: string;
  goal_lock_enabled: boolean;
  goal_lock_month: number;
  goal_lock_day: number;
  review_start_month: number;
  review_start_day: number;
  review_end_month: number;
  review_end_day: number;
};

function rowToSettings(row: CycleRow | null): MboCycleSettings {
  if (!row) return { ...DEFAULT_MBO_CYCLE };
  return normalizeCycleSettings({
    goalLockEnabled: row.goal_lock_enabled,
    goalLockMonth: row.goal_lock_month,
    goalLockDay: row.goal_lock_day,
    reviewStartMonth: row.review_start_month,
    reviewStartDay: row.review_start_day,
    reviewEndMonth: row.review_end_month,
    reviewEndDay: row.review_end_day,
  });
}

export async function getMboCycleSettings(organizationId: string): Promise<MboCycleSettings> {
  const client = getCoreClient() as unknown as { from: (table: string) => any };
  const { data, error } = await client
    .from('mbo_cycle_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) throw error;
  return rowToSettings(data as CycleRow | null);
}

export async function upsertMboCycleSettings(
  organizationId: string,
  settings: MboCycleSettings,
  updatedBy?: string
): Promise<MboCycleSettings> {
  const client = getCoreClient() as unknown as { from: (table: string) => any };
  const payload = {
    organization_id: organizationId,
    goal_lock_enabled: settings.goalLockEnabled,
    goal_lock_month: settings.goalLockMonth,
    goal_lock_day: settings.goalLockDay,
    review_start_month: settings.reviewStartMonth,
    review_start_day: settings.reviewStartDay,
    review_end_month: settings.reviewEndMonth,
    review_end_day: settings.reviewEndDay,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
  const { data, error } = await client
    .from('mbo_cycle_settings')
    .upsert(payload, { onConflict: 'organization_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToSettings(data as CycleRow);
}
