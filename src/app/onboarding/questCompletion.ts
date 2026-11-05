/**
 * Getting Started 퀘스트 실데이터 완료 감지.
 * StorageService(로컬 hydrate) 기준으로 quest id / targetTab 휴리스틱을 적용한다.
 * Core·Capability에 업종 if 분기를 두지 않고 App onboarding 레이어에만 둔다.
 */

import type { QuestItem } from './questEngine';
import { StorageService } from '@/services/storage';

type StorageSnapshot = {
  students: unknown[];
  classes: unknown[];
  attendance: unknown[];
  invoices: unknown[];
  sessionPasses: unknown[];
  bookings: unknown[];
};

function safeList(getter: () => unknown): unknown[] {
  try {
    const value = getter();
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** hydrate 전후 모두 안전하게 스냅샷 */
export function readQuestStorageSnapshot(): StorageSnapshot {
  const api = StorageService as Record<string, () => unknown>;
  return {
    students: safeList(() => api.getStudents?.()),
    classes: safeList(() => api.getClasses?.()),
    attendance: safeList(() => api.getAttendance?.()),
    invoices: safeList(() => api.getInvoices?.()),
    sessionPasses: safeList(() => api.getSessionPasses?.()),
    bookings: safeList(() => api.getBookings?.()),
  };
}

function isCustomerQuest(id: string): boolean {
  return (
    id.includes('register_first') ||
    id.includes('first_member') ||
    id.includes('first_student') ||
    id.includes('first_client') ||
    id.includes('first_entity') ||
    id === 'register_first_entity'
  );
}

function isScheduleQuest(id: string): boolean {
  return (
    id.includes('regular_class') ||
    id.includes('open_booking') ||
    id.includes('create_regular')
  );
}

function isAttendanceQuest(id: string): boolean {
  return (
    id.includes('attendance') ||
    id.includes('kiosk_access') ||
    id.includes('check_first')
  );
}

function isBillingQuest(id: string): boolean {
  return (
    id.includes('invoice') ||
    id.includes('billing') ||
    id.includes('tuition') ||
    id.includes('setup_pass')
  );
}

function isPassQuest(id: string): boolean {
  return id.includes('pass') || id.includes('lesson_pass') || id.includes('time_pass');
}

function isInventoryQuest(id: string): boolean {
  return id.includes('product') || id.includes('inventory') || id.includes('stock');
}

/**
 * 스냅샷 기준으로 완료로 간주할 quest id 목록을 반환한다.
 * 수동 체크와 merge할 때 사용한다.
 */
export function detectCompletedQuestIds(
  quests: QuestItem[],
  snapshot: StorageSnapshot = readQuestStorageSnapshot()
): string[] {
  const completed: string[] = [];

  for (const quest of quests) {
    const id = quest.id;
    let done = false;

    if (isCustomerQuest(id) || quest.targetTab === 'students') {
      if (isCustomerQuest(id)) done = snapshot.students.length > 0;
    }
    if (isScheduleQuest(id) || quest.targetTab === 'timetable' || quest.targetTab === 'bookings') {
      if (isScheduleQuest(id) || quest.targetTab === 'timetable') {
        done = done || snapshot.classes.length > 0;
      }
      if (quest.targetTab === 'bookings' || id.includes('booking')) {
        done = done || snapshot.bookings.length > 0 || snapshot.classes.length > 0;
      }
    }
    if (isAttendanceQuest(id) || quest.targetTab === 'attendance') {
      if (isAttendanceQuest(id) || quest.targetTab === 'attendance') {
        done = done || snapshot.attendance.length > 0;
      }
    }
    if (isBillingQuest(id) || quest.targetTab === 'tuition' || quest.targetTab === 'finance') {
      if (isBillingQuest(id) || quest.targetTab === 'tuition') {
        done = done || snapshot.invoices.length > 0;
      }
    }
    if (isPassQuest(id) || quest.targetTab === 'passes') {
      if (isPassQuest(id) || quest.targetTab === 'passes') {
        done = done || snapshot.sessionPasses.length > 0;
      }
    }
    if (isInventoryQuest(id) || quest.targetTab === 'inventory') {
      // 재고는 StorageService 스냅샷이 약하므로 수동 위주 — 상품 등록 퀘스트는 자동 미적용
      done = done || false;
    }

    // id 전용 확정 규칙 (피아노 wave-1)
    if (id === 'register_first_student') done = snapshot.students.length > 0;
    if (id === 'create_regular_class') done = snapshot.classes.length > 0;
    if (id === 'check_first_attendance') done = snapshot.attendance.length > 0;
    if (id === 'issue_first_invoice') done = snapshot.invoices.length > 0;

    if (done) completed.push(id);
  }

  return completed;
}

export function mergeQuestCompletion(
  manualIds: string[],
  detectedIds: string[]
): string[] {
  return Array.from(new Set([...manualIds, ...detectedIds]));
}

export function getQuestDismissedKey(organizationId?: string): string {
  return `moa_onboarding_quests_dismissed_${organizationId || 'default'}`;
}

export function isQuestWidgetDismissed(organizationId?: string): boolean {
  try {
    return localStorage.getItem(getQuestDismissedKey(organizationId)) === '1';
  } catch {
    return false;
  }
}

export function setQuestWidgetDismissed(organizationId: string | undefined, dismissed: boolean): void {
  try {
    const key = getQuestDismissedKey(organizationId);
    if (dismissed) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // noop
  }
}
