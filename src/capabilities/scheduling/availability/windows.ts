import {
  AVAILABILITY_WEEKDAY_LABELS,
  type AvailabilityDayOfWeek,
  type AvailabilityOverride,
  type AvailabilityResourceWindow,
  type AvailabilityRule,
  type AvailabilitySlotMinutes,
  type AvailabilityStaffWindow,
  type AvailabilityTimeWindow,
  type ResolvedAvailabilityWindow,
} from './types';

export function toHm(value: string): string {
  return value.trim().slice(0, 5);
}

export function localPartsFromIso(iso: string): {
  dayLabel: (typeof AVAILABILITY_WEEKDAY_LABELS)[number];
  dow: AvailabilityDayOfWeek;
  hm: string;
  dateKey: string;
} | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const dow = date.getDay() as AvailabilityDayOfWeek;
  const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { dayLabel: AVAILABILITY_WEEKDAY_LABELS[dow], dow, hm, dateKey };
}

export function dowFromDateKey(dateKey: string): AvailabilityDayOfWeek {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() as AvailabilityDayOfWeek;
}

export function hmRangeInside(
  startHm: string,
  endHm: string,
  windowStart: string,
  windowEnd: string
): boolean {
  return startHm >= windowStart && endHm <= windowEnd && startHm < endHm;
}

export function matchesAvailabilityScope(
  row: { staff_id: string | null },
  staffId?: string | null
): boolean {
  if (staffId === undefined) return true;
  if (staffId === null) return row.staff_id == null;
  return row.staff_id === staffId;
}

export function getIntervalMinutes(
  slotMinutes: AvailabilitySlotMinutes,
  metadata?: Record<string, unknown> | null
): AvailabilitySlotMinutes {
  const raw = metadata?.interval_minutes;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (n === 15 || n === 20 || n === 30 || n === 45 || n === 60) return n;
  return slotMinutes;
}

export function getOverrideWindows(
  override: Pick<AvailabilityOverride, 'start_time' | 'end_time' | 'metadata' | 'is_closed'>
): AvailabilityTimeWindow[] {
  if (override.is_closed) return [];
  const metaWindows = override.metadata?.windows;
  if (Array.isArray(metaWindows) && metaWindows.length > 0) {
    return metaWindows
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          start_time: String(row.start_time ?? '').slice(0, 5),
          end_time: String(row.end_time ?? '').slice(0, 5),
        };
      })
      .filter((window) => window.start_time && window.end_time && window.start_time < window.end_time);
  }
  if (override.start_time && override.end_time) {
    return [
      {
        start_time: override.start_time.slice(0, 5),
        end_time: override.end_time.slice(0, 5),
      },
    ];
  }
  return [];
}

function parseHm(value: string): { h: number; m: number } {
  const [h, m] = toHm(value).split(':').map(Number);
  return { h, m };
}

export function combineLocal(dateKey: string, time: string): Date {
  const { h, m } = parseHm(time);
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, h, m, 0, 0);
}

/** 상담 시간(duration)과 예약 시작 간격(interval)을 구분해 슬롯 생성. */
export function chunkSlots(
  dateKey: string,
  startTime: string,
  endTime: string,
  slotMinutes: AvailabilitySlotMinutes,
  intervalMinutes?: AvailabilitySlotMinutes
): Array<{ starts: Date; ends: Date }> {
  const slots: Array<{ starts: Date; ends: Date }> = [];
  let cursor = combineLocal(dateKey, startTime);
  const end = combineLocal(dateKey, endTime);
  const durationMs = slotMinutes * 60 * 1000;
  const stepMs = (intervalMinutes ?? slotMinutes) * 60 * 1000;

  while (cursor.getTime() + durationMs <= end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMs);
    slots.push({ starts: cursor, ends: slotEnd });
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return slots;
}

export function resolveWindowsForDate(params: {
  date: string;
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  staffId?: string | null;
  defaultTitle?: string;
}): { closed: boolean; windows: ResolvedAvailabilityWindow[] } {
  const rules = params.rules.filter((row) => matchesAvailabilityScope(row, params.staffId));
  const override = params.overrides.find(
    (row) =>
      row.override_date === params.date &&
      row.is_active !== false &&
      matchesAvailabilityScope(row, params.staffId)
  );
  const fallbackTitle = params.defaultTitle ?? '';

  if (override?.is_closed) {
    return { closed: true, windows: [] };
  }

  if (override && !override.is_closed) {
    const slotMinutes = (override.slot_minutes ?? 30) as AvailabilitySlotMinutes;
    const intervalMinutes = getIntervalMinutes(slotMinutes, override.metadata);
    return {
      closed: false,
      windows: getOverrideWindows(override).map((window) => ({
        start_time: window.start_time,
        end_time: window.end_time,
        slotMinutes,
        intervalMinutes,
        title: override.title || fallbackTitle,
        maxCapacity: override.max_capacity ?? 1,
        overrideId: override.id,
      })),
    };
  }

  const dow = dowFromDateKey(params.date);
  return {
    closed: false,
    windows: rules
      .filter((rule) => rule.day_of_week === dow && rule.is_active !== false)
      .map((rule) => ({
        start_time: toHm(rule.start_time),
        end_time: toHm(rule.end_time),
        slotMinutes: rule.slot_minutes,
        intervalMinutes: getIntervalMinutes(rule.slot_minutes, rule.metadata),
        title: rule.title || fallbackTitle,
        maxCapacity: rule.max_capacity,
        ruleId: rule.id,
      })),
  };
}

export function isClosedOnDate(params: {
  date: string;
  overrides: Array<Pick<AvailabilityOverride, 'override_date' | 'is_closed' | 'is_active' | 'staff_id'>>;
  staffId?: string | null;
}): boolean {
  return params.overrides.some(
    (row) =>
      row.override_date === params.date &&
      row.is_active !== false &&
      row.is_closed &&
      matchesAvailabilityScope(row, params.staffId)
  );
}

/** 규칙/예외가 있으면 그 창 밖은 차단. 정의가 없으면 제한 없음. */
export function isOutsideAvailabilityWindows(params: {
  startsAt: string;
  endsAt: string;
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  staffId?: string | null;
}): boolean {
  const start = localPartsFromIso(params.startsAt);
  const end = localPartsFromIso(params.endsAt);
  if (!start || !end) return true;
  if (start.dateKey !== end.dateKey) return true;

  const scopedRules = params.rules.filter((row) => matchesAvailabilityScope(row, params.staffId ?? null));
  const resolved = resolveWindowsForDate({
    date: start.dateKey,
    rules: params.rules,
    overrides: params.overrides,
    staffId: params.staffId ?? null,
  });
  if (resolved.closed) return true;
  if (resolved.windows.length > 0) {
    return !resolved.windows.some((window) =>
      hmRangeInside(start.hm, end.hm, toHm(window.start_time), toHm(window.end_time))
    );
  }
  return scopedRules.length > 0;
}

function isOutsideActorWindows(params: {
  actorId?: string;
  startsAt: string;
  endsAt: string;
  windows: Array<{ actorId: string; days: AvailabilityStaffWindow['days']; startTime: string; endTime: string }>;
}): boolean {
  if (!params.actorId) return false;
  const mine = params.windows.filter(
    (window) =>
      window.actorId === params.actorId && window.days.length > 0 && window.startTime && window.endTime
  );
  if (mine.length === 0) return false;
  const start = localPartsFromIso(params.startsAt);
  const end = localPartsFromIso(params.endsAt);
  if (!start || !end) return true;
  return !mine.some(
    (window) =>
      window.days.includes(start.dayLabel) &&
      start.dayLabel === end.dayLabel &&
      start.hm >= window.startTime &&
      end.hm <= window.endTime
  );
}

/** 근무창이 없으면 제한 없음. 있으면 시작·종료가 같은 요일 창 안에 있어야 한다 */
export function isOutsideStaffHours(params: {
  staffId?: string;
  startsAt: string;
  endsAt: string;
  windows?: AvailabilityStaffWindow[];
}): boolean {
  return isOutsideActorWindows({
    actorId: params.staffId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    windows: (params.windows ?? []).map((window) => ({
      actorId: window.staffId,
      days: window.days,
      startTime: window.startTime,
      endTime: window.endTime,
    })),
  });
}

export function isOutsideResourceHours(params: {
  resourceId?: string;
  startsAt: string;
  endsAt: string;
  windows?: AvailabilityResourceWindow[];
}): boolean {
  return isOutsideActorWindows({
    actorId: params.resourceId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    windows: (params.windows ?? []).map((window) => ({
      actorId: window.resourceId,
      days: window.days ?? [...AVAILABILITY_WEEKDAY_LABELS],
      startTime: window.startTime,
      endTime: window.endTime,
    })),
  });
}

export function windowsFromResourceHours(resource: {
  id: string;
  open_time: string;
  close_time: string;
}): AvailabilityResourceWindow {
  return {
    resourceId: resource.id,
    days: [...AVAILABILITY_WEEKDAY_LABELS],
    startTime: toHm(resource.open_time),
    endTime: toHm(resource.close_time),
  };
}
