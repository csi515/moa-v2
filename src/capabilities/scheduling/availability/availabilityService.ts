import { getCoreClient } from '@/lib/supabase';
import type {
  AvailabilityOverrideRow,
  AvailabilityRuleRow,
} from '@/lib/supabase/database.types';
import type {
  AvailabilityDayOfWeek,
  AvailabilityListQuery,
  AvailabilityOverride,
  AvailabilityOverrideInput,
  AvailabilityRule,
  AvailabilityRuleInput,
  AvailabilitySlotMinutes,
} from './types';
import { jsonToRecord, recordToJson } from '@/core/schedules/services/scheduleJson';

function asListQuery(value: boolean | AvailabilityListQuery | undefined): AvailabilityListQuery {
  if (typeof value === 'object' && value) return value;
  return { activeOnly: value !== false };
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function asDayOfWeek(value: number): AvailabilityDayOfWeek {
  // DB smallint → 도메인 0–6 유니온
  return value as AvailabilityDayOfWeek;
}

function asSlotMinutes(value: number): AvailabilitySlotMinutes {
  // DB int → 도메인 슬롯 분 유니온
  return value as AvailabilitySlotMinutes;
}

function mapRule(row: AvailabilityRuleRow): AvailabilityRule {
  return {
    id: row.id,
    organization_id: row.organization_id,
    staff_id: row.staff_id,
    day_of_week: asDayOfWeek(row.day_of_week),
    start_time: String(row.start_time).slice(0, 8),
    end_time: String(row.end_time).slice(0, 8),
    slot_minutes: asSlotMinutes(row.slot_minutes),
    title: row.title ?? '상담',
    max_capacity: row.max_capacity ?? 1,
    is_active: row.is_active,
    metadata: jsonToRecord(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapOverride(row: AvailabilityOverrideRow): AvailabilityOverride {
  return {
    id: row.id,
    organization_id: row.organization_id,
    staff_id: row.staff_id,
    override_date: String(row.override_date).slice(0, 10),
    is_closed: row.is_closed,
    start_time: row.start_time ? String(row.start_time).slice(0, 8) : null,
    end_time: row.end_time ? String(row.end_time).slice(0, 8) : null,
    slot_minutes: row.slot_minutes != null ? asSlotMinutes(row.slot_minutes) : null,
    title: row.title,
    max_capacity: row.max_capacity,
    is_active: row.is_active,
    reason: row.reason,
    metadata: jsonToRecord(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Availability CRUD (숨김= is_active false, 하드 삭제 최소화) */
export const availabilityService = {
  async listRules(
    organizationId: string,
    activeOnlyOrQuery: boolean | AvailabilityListQuery = true
  ): Promise<AvailabilityRule[]> {
    const listQuery = asListQuery(activeOnlyOrQuery);
    let query = getCoreClient()
      .from('availability_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (listQuery.activeOnly !== false) query = query.eq('is_active', true);
    if (listQuery.staffId === null) query = query.is('staff_id', null);
    else if (listQuery.staffId) query = query.eq('staff_id', listQuery.staffId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRule);
  },

  async createRule(
    organizationId: string,
    input: AvailabilityRuleInput
  ): Promise<AvailabilityRule> {
    const slotMinutes = input.slot_minutes ?? 30;
    const intervalMinutes = input.interval_minutes ?? slotMinutes;
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      ...(intervalMinutes !== slotMinutes ? { interval_minutes: intervalMinutes } : {}),
    };
    if (intervalMinutes === slotMinutes && metadata.interval_minutes == null) {
      metadata.interval_minutes = intervalMinutes;
    }

    const { data, error } = await getCoreClient()
      .from('availability_rules')
      .insert({
        organization_id: organizationId,
        staff_id: input.staff_id ?? null,
        day_of_week: input.day_of_week,
        start_time: normalizeTime(input.start_time),
        end_time: normalizeTime(input.end_time),
        slot_minutes: slotMinutes,
        title: input.title?.trim() || '상담',
        max_capacity: input.max_capacity ?? 1,
        is_active: true,
        metadata: recordToJson(metadata),
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapRule(data);
  },

  /** 요일의 활성 규칙을 모두 비활성화 (일괄 교체 전) */
  async deactivateRulesForDay(
    organizationId: string,
    dayOfWeek: AvailabilityRule['day_of_week'],
    staffId: string | null = null
  ): Promise<void> {
    let query = getCoreClient()
      .from('availability_rules')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);
    query = staffId == null ? query.is('staff_id', null) : query.eq('staff_id', staffId);
    const { error } = await query;
    if (error) throw error;
  },

  async deactivateRule(ruleId: string): Promise<void> {
    const { error } = await getCoreClient()
      .from('availability_rules')
      .update({ is_active: false })
      .eq('id', ruleId);
    if (error) throw error;
  },

  async listOverrides(
    organizationId: string,
    fromDate?: string,
    activeOnlyOrQuery: boolean | AvailabilityListQuery = true
  ): Promise<AvailabilityOverride[]> {
    const listQuery = asListQuery(activeOnlyOrQuery);
    let query = getCoreClient()
      .from('availability_overrides')
      .select('*')
      .eq('organization_id', organizationId)
      .order('override_date', { ascending: true });

    if (listQuery.activeOnly !== false) query = query.eq('is_active', true);
    if (fromDate) query = query.gte('override_date', fromDate);
    if (listQuery.staffId === null) query = query.is('staff_id', null);
    else if (listQuery.staffId) query = query.eq('staff_id', listQuery.staffId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapOverride);
  },

  async upsertOverride(
    organizationId: string,
    input: AvailabilityOverrideInput
  ): Promise<AvailabilityOverride> {
    const existing = await this.listOverrides(organizationId, input.override_date, {
      activeOnly: true,
      staffId: input.staff_id ?? null,
    });
    const sameDay = existing.find((o) => o.override_date === input.override_date);

    const windows = input.windows?.filter((w) => w.start_time && w.end_time) ?? [];
    const primary = windows[0];
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
    };
    if (!input.is_closed && windows.length > 0) {
      metadata.windows = windows.map((w) => ({
        start_time: w.start_time.slice(0, 5),
        end_time: w.end_time.slice(0, 5),
      }));
    }

    const payload = {
      organization_id: organizationId,
      staff_id: input.staff_id ?? null,
      override_date: input.override_date,
      is_closed: input.is_closed,
      start_time: input.is_closed
        ? null
        : normalizeTime(primary?.start_time || input.start_time || '00:00'),
      end_time: input.is_closed
        ? null
        : normalizeTime(primary?.end_time || input.end_time || '00:00'),
      slot_minutes: input.is_closed ? null : (input.slot_minutes ?? 30),
      title: input.title?.trim() || null,
      max_capacity: input.is_closed ? null : (input.max_capacity ?? 1),
      reason: input.reason?.trim() || null,
      is_active: true,
      metadata: recordToJson(metadata),
    };

    if (sameDay) {
      const { data, error } = await getCoreClient()
        .from('availability_overrides')
        .update(payload)
        .eq('id', sameDay.id)
        .select('*')
        .single();
      if (error) throw error;
      return mapOverride(data);
    }

    const { data, error } = await getCoreClient()
      .from('availability_overrides')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return mapOverride(data);
  },

  async deactivateOverride(overrideId: string): Promise<void> {
    const { error } = await getCoreClient()
      .from('availability_overrides')
      .update({ is_active: false })
      .eq('id', overrideId);
    if (error) throw error;
  },
};
