/**
 * 데이터별 Source of Truth 정책.
 * 새 storage key는 정책을 선언한다. 기존 키 동작은 한꺼번에 바꾸지 않는다.
 */

export const PERSISTENCE_POLICIES = [
  'server-authoritative',
  'server-with-local-cache',
  'offline-command',
  'local-only',
] as const;

export type PersistencePolicy = (typeof PERSISTENCE_POLICIES)[number];

export type PersistencePolicyRule = {
  policy: PersistencePolicy;
  /** 원본 위치. cache는 원본이 아니다. */
  sourceOfTruth: 'server' | 'local' | 'command-queue';
  /** localStorage write 성공을 업무 성공으로 볼 수 있는지 */
  localWriteConfirms: boolean;
};

export const PERSISTENCE_POLICY_RULES: Record<PersistencePolicy, PersistencePolicyRule> = {
  'server-authoritative': {
    policy: 'server-authoritative',
    sourceOfTruth: 'server',
    localWriteConfirms: false,
  },
  'server-with-local-cache': {
    policy: 'server-with-local-cache',
    sourceOfTruth: 'server',
    localWriteConfirms: false,
  },
  'offline-command': {
    policy: 'offline-command',
    sourceOfTruth: 'command-queue',
    localWriteConfirms: false,
  },
  'local-only': {
    policy: 'local-only',
    sourceOfTruth: 'local',
    localWriteConfirms: true,
  },
};

/**
 * 대표 핵심 키만 명시. 나머지는 기존 SYNC/LOCAL_ONLY 분류를 따른다.
 * 값은 src/services/adapters/storageKeys.ts STORAGE_KEYS 와 동일해야 한다.
 */
export const DECLARED_STORAGE_KEY_POLICIES = {
  piano_app_tuition_payments: 'server-authoritative',
  piano_app_invoices: 'server-authoritative',
  core_session_passes: 'server-authoritative',
  core_schedules: 'server-authoritative',
  piano_app_textbook_sales: 'server-authoritative',
  piano_app_textbook_payments: 'server-authoritative',
  piano_app_students: 'server-with-local-cache',
  piano_app_teachers: 'server-with-local-cache',
  piano_app_settings: 'server-with-local-cache',
  piano_app_attendance: 'server-with-local-cache',
  daycare_care_child_records: 'server-with-local-cache',
  daycare_care_incidents: 'server-with-local-cache',
  piano_app_active_user: 'local-only',
  piano_app_initialized_v3: 'local-only',
  piano_app_onboarding_progress_v1: 'local-only',
  core_shuttle_ride_requests: 'local-only',
} as const satisfies Record<string, PersistencePolicy>;

/**
 * 아직 재분류하지 않은 기존 STORAGE_KEYS.
 * 신규 키는 여기가 아니라 DECLARED_STORAGE_KEY_POLICIES에 넣는다.
 * 런타임 fallback은 유지한다 — 이 목록은 누락 탐지용.
 */
export const LEGACY_STORAGE_KEY_POLICIES = {
  piano_app_parents: 'server-with-local-cache',
  core_parent_student_links: 'server-with-local-cache',
  piano_app_classes: 'server-with-local-cache',
  core_attendance_sessions: 'server-with-local-cache',
  core_customer_pins: 'server-with-local-cache',
  core_expenses: 'server-with-local-cache',
  core_teacher_payroll_settlements: 'server-with-local-cache',
  core_income_entries: 'server-with-local-cache',
  piano_app_consultations: 'server-with-local-cache',
  piano_app_practice_records: 'server-with-local-cache',
  piano_app_lesson_records: 'server-with-local-cache',
  piano_app_textbooks: 'server-with-local-cache',
  piano_app_textbook_inventory_transactions: 'server-with-local-cache',
  piano_app_songs: 'server-with-local-cache',
  piano_app_events: 'server-with-local-cache',
  piano_app_performance_videos: 'server-with-local-cache',
  piano_curriculum_levels: 'server-with-local-cache',
  piano_curriculum_items: 'server-with-local-cache',
  piano_curriculum_progress: 'server-with-local-cache',
  piano_weekly_assignments: 'server-with-local-cache',
  piano_achievements: 'server-with-local-cache',
  piano_learning_reports: 'server-with-local-cache',
  piano_app_notifications: 'server-with-local-cache',
  core_service_offerings: 'server-with-local-cache',
  core_slot_recruitments: 'local-only',
  core_practice_room_bookings: 'server-with-local-cache',
  daycare_care_journals: 'server-with-local-cache',
  daycare_medication_requests: 'server-with-local-cache',
  daycare_care_staff_health_certs: 'server-with-local-cache',
  daycare_care_safety_logs: 'server-with-local-cache',
  daycare_care_meal_samples: 'server-with-local-cache',
  daycare_care_cctv_requests: 'server-with-local-cache',
  daycare_care_pickup_logs: 'server-with-local-cache',
} as const satisfies Record<string, PersistencePolicy>;

/** pendingMutations / syncOutbox 는 데이터가 아니라 offline command 큐. */
export const OFFLINE_COMMAND_STORE_POLICIES = {
  pendingMutations: 'offline-command',
  syncOutbox: 'offline-command',
} as const satisfies Record<string, PersistencePolicy>;

export function persistencePolicyFor(
  key: string,
  fallback?: PersistencePolicy
): PersistencePolicy {
  const declared = DECLARED_STORAGE_KEY_POLICIES[key as keyof typeof DECLARED_STORAGE_KEY_POLICIES];
  if (declared) return declared;
  const legacy = LEGACY_STORAGE_KEY_POLICIES[key as keyof typeof LEGACY_STORAGE_KEY_POLICIES];
  if (legacy) return legacy;
  return fallback ?? 'server-with-local-cache';
}

export function coveredPersistencePolicyKeys(): Set<string> {
  return new Set([
    ...Object.keys(DECLARED_STORAGE_KEY_POLICIES),
    ...Object.keys(LEGACY_STORAGE_KEY_POLICIES),
  ]);
}

/** STORAGE_KEYS 중 선언·legacy 둘 다 없는 키. 비어 있어야 한다. */
export function uncoveredStorageKeys(allKeys: readonly string[]): string[] {
  const covered = coveredPersistencePolicyKeys();
  return allKeys.filter((key) => !covered.has(key));
}

/** 선언/legacy에만 있고 STORAGE_KEYS에 없는 키 */
export function orphanPersistencePolicyKeys(allKeys: readonly string[]): string[] {
  const known = new Set(allKeys);
  return [...coveredPersistencePolicyKeys()].filter((key) => !known.has(key));
}

export function persistenceRuleFor(key: string, fallback?: PersistencePolicy): PersistencePolicyRule {
  return PERSISTENCE_POLICY_RULES[persistencePolicyFor(key, fallback)];
}

/** server 원본 데이터는 local write만으로 성공 확정하지 않는다. */
export function localWriteConfirmsPersist(key: string, fallback?: PersistencePolicy): boolean {
  return persistenceRuleFor(key, fallback).localWriteConfirms;
}

export function isServerSourcedPolicy(policy: PersistencePolicy): boolean {
  return (
    policy === 'server-authoritative' ||
    policy === 'server-with-local-cache' ||
    policy === 'offline-command'
  );
}
