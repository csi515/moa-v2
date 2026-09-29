import { AVAILABILITY_SOURCE } from './types';
import { chunkSlots, resolveWindowsForDate } from './windows';
import { getCoreClient } from '@/lib/supabase';
import type { CoreSchedule } from '@/types';
import { availabilityService } from './availabilityService';
import { coreScheduleService } from '@/core/schedules/services/coreScheduleService';

const DEFAULT_HORIZON_DAYS = 14;

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function slotKey(orgId: string, startsAt: string, endsAt: string): string {
  return `${orgId}|${startsAt}|${endsAt}`;
}

export interface MaterializeResult {
  created: number;
  kept: number;
  hidden: number;
}

/**
 * Availability 규칙 → core.schedules(is_bookable) 슬롯 생성
 * - 기존 일정과 겹치면 스킵
 * - 더 이상 필요 없는 생성 슬롯은 is_bookable=false로 숨김 (예약 있으면 유지)
 */
export async function materializeAvailabilitySlots(
  organizationId: string,
  horizonDays = DEFAULT_HORIZON_DAYS
): Promise<MaterializeResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonEnd = new Date(today);
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays);

  const [rules, overrides, schedules] = await Promise.all([
    availabilityService.listRules(organizationId, { activeOnly: true, staffId: null }),
    availabilityService.listOverrides(organizationId, toDateKey(today), {
      activeOnly: true,
      staffId: null,
    }),
    coreScheduleService.getOrganizationSchedules(
      organizationId,
      today.toISOString(),
      horizonEnd.toISOString()
    ),
  ]);

  const desiredKeys = new Set<string>();
  const desiredSlots: Array<{
    key: string;
    title: string;
    starts: Date;
    ends: Date;
    maxCapacity: number;
    ruleId?: string;
    overrideId?: string;
  }> = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dateKey = toDateKey(date);
    const resolved = resolveWindowsForDate({
      date: dateKey,
      rules,
      overrides,
      staffId: null,
      defaultTitle: '상담',
    });

    for (const win of resolved.windows) {
      for (const slot of chunkSlots(
        dateKey,
        win.start_time,
        win.end_time,
        win.slotMinutes,
        win.intervalMinutes
      )) {
        const startsAt = slot.starts.toISOString();
        const endsAt = slot.ends.toISOString();
        const key = slotKey(organizationId, startsAt, endsAt);

        const blocked = schedules.some((s) => {
          const meta = s.metadata ?? {};
          const isGenerated = meta.source === AVAILABILITY_SOURCE;
          if (isGenerated) return false;
          if (s.status === 'cancelled') return false;
          return overlaps(slot.starts, slot.ends, new Date(s.starts_at), new Date(s.ends_at));
        });
        if (blocked) continue;

        desiredKeys.add(key);
        desiredSlots.push({
          key,
          title: win.title,
          starts: slot.starts,
          ends: slot.ends,
          maxCapacity: win.maxCapacity,
          ruleId: win.ruleId,
          overrideId: win.overrideId,
        });
      }
    }
  }

  const generated = schedules.filter(
    (s) => (s.metadata ?? {}).source === AVAILABILITY_SOURCE
  );

  let created = 0;
  let kept = 0;
  let hidden = 0;

  const existingByKey = new Map<string, CoreSchedule>();
  for (const s of generated) {
    const key =
      typeof (s.metadata as { slot_key?: string })?.slot_key === 'string'
        ? String((s.metadata as { slot_key?: string }).slot_key)
        : slotKey(organizationId, s.starts_at, s.ends_at);
    existingByKey.set(key, s);
  }

  for (const slot of desiredSlots) {
    const existing = existingByKey.get(slot.key);
    if (existing) {
      kept += 1;
      if (!existing.is_bookable) {
        await coreScheduleService.toggleBookable(existing.id, true);
      }
      continue;
    }

    const { error } = await getCoreClient()
      .from('schedules')
      .insert({
        organization_id: organizationId,
        title: slot.title,
        starts_at: slot.starts.toISOString(),
        ends_at: slot.ends.toISOString(),
        is_bookable: true,
        max_capacity: slot.maxCapacity,
        status: 'scheduled',
        metadata: {
          source: AVAILABILITY_SOURCE,
          slot_key: slot.key,
          rule_id: slot.ruleId ?? null,
          override_id: slot.overrideId ?? null,
        },
      } as any);

    if (error) throw error;
    created += 1;
  }

  for (const [key, schedule] of existingByKey) {
    if (desiredKeys.has(key)) continue;
    if (!schedule.is_bookable) continue;

    // 예약이 있으면 숨기지 않고 유지 (히스토리)
    const { count, error } = await getCoreClient()
      .from('reservations' as any)
      .select('id', { count: 'exact', head: true })
      .eq('schedule_id', schedule.id)
      .in('status', ['requested', 'confirmed']);

    if (error) throw error;
    if ((count ?? 0) > 0) continue;

    await coreScheduleService.toggleBookable(schedule.id, false);
    hidden += 1;
  }

  return { created, kept, hidden };
}

export type { AvailabilityOverride, AvailabilityRule } from './types';
