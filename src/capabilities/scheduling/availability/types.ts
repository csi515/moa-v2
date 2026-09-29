/** 업종 무관 Availability. 조직·직원·자원 시간창을 같은 의미로 다룬다. */

export type AvailabilitySlotMinutes = 15 | 20 | 30 | 45 | 60;

/** 0=일요일 … 6=토요일 (JS Date.getDay와 동일) */
export type AvailabilityDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const AVAILABILITY_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
export type AvailabilityWeekdayLabel = (typeof AVAILABILITY_WEEKDAY_LABELS)[number];

export const DAY_OF_WEEK_LABELS: Record<AvailabilityDayOfWeek, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export const AVAILABILITY_SOURCE = 'availability_rule' as const;

export interface AvailabilityRule {
  id: string;
  organization_id: string;
  staff_id: string | null;
  day_of_week: AvailabilityDayOfWeek;
  start_time: string;
  end_time: string;
  slot_minutes: AvailabilitySlotMinutes;
  title: string;
  max_capacity: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityOverride {
  id: string;
  organization_id: string;
  staff_id: string | null;
  override_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_minutes: AvailabilitySlotMinutes | null;
  title: string | null;
  max_capacity: number | null;
  is_active: boolean;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityTimeWindow {
  start_time: string;
  end_time: string;
}

export interface AvailabilityRuleInput {
  day_of_week: AvailabilityDayOfWeek;
  start_time: string;
  end_time: string;
  slot_minutes?: AvailabilitySlotMinutes;
  title?: string;
  max_capacity?: number;
  interval_minutes?: AvailabilitySlotMinutes;
  metadata?: Record<string, unknown>;
  /** 있으면 직원 스코프. 없으면 조직 공통. */
  staff_id?: string | null;
}

export interface AvailabilityOverrideInput {
  override_date: string;
  is_closed: boolean;
  start_time?: string | null;
  end_time?: string | null;
  slot_minutes?: AvailabilitySlotMinutes | null;
  title?: string | null;
  max_capacity?: number | null;
  reason?: string | null;
  windows?: AvailabilityTimeWindow[];
  metadata?: Record<string, unknown>;
  staff_id?: string | null;
}

export type AvailabilityListQuery = {
  activeOnly?: boolean;
  /** null = 조직 공통(staff_id IS NULL). 생략 시 전체 */
  staffId?: string | null;
};

/** 직원 반복 가능시간. 설정 JSON 또는 향후 availability_rules.staff_id 와 동일 의미. */
export type AvailabilityStaffWindow = {
  staffId: string;
  days: AvailabilityWeekdayLabel[];
  startTime: string;
  endTime: string;
};

/** 자원 가능시간. 향후 bookable_resources.open/close 와 연결한다. */
export type AvailabilityResourceWindow = {
  resourceId: string;
  days?: AvailabilityWeekdayLabel[];
  startTime: string;
  endTime: string;
};

export type ResolvedAvailabilityWindow = {
  start_time: string;
  end_time: string;
  slotMinutes: AvailabilitySlotMinutes;
  intervalMinutes: AvailabilitySlotMinutes;
  title: string;
  maxCapacity: number;
  ruleId?: string;
  overrideId?: string;
};
