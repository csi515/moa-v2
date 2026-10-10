import type { AcademySettings, User } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { getIndustryType } from '../adapters/storageContext';
import { isAppointmentIndustry } from '@/core/industry/industryUi';
import { resolveAttendanceEnabledForBackfill } from '../../core/attendance/features';
import { DEFAULT_SETTINGS, getItem, setItem, type StorageApi } from './helpers';
import { storageApi } from './storageApi';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingProgress {
  status: OnboardingStatus;
  /** 0-based wizard step index */
  step: number;
  updatedAt?: string;
}

const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  status: 'not_started',
  step: 0,
};

/**
 * 설정 부분 업데이트 시 다른 업종의 설정 및 중첩 객체(features, industrySettings 등)가
 * 덮어쓰여 삭제되지 않도록 재귀적으로 안전하게 병합합니다.
 */
export function mergeOrganizationSettings(
  current: AcademySettings,
  incoming: Partial<AcademySettings>
): AcademySettings {
  const merged: AcademySettings = {
    ...current,
    ...incoming,
  };

  // 1. features 객체 중첩 병합 (attendance, points 등 독립 기능 플래그 보존)
  if (current.features || incoming.features) {
    merged.features = {
      ...current.features,
      ...incoming.features,
      ...(current.features?.attendance || incoming.features?.attendance
        ? {
            attendance: {
              ...current.features?.attendance,
              ...incoming.features?.attendance,
            },
          }
        : {}),
      ...(current.features?.points || incoming.features?.points
        ? {
            points: {
              ...current.features?.points,
              ...incoming.features?.points,
            },
          }
        : {}),
    };
  }

  // 2. industrySettings 객체 중첩 병합 (업종별 파티션 education, booking, retail 등 상호 보존)
  if (current.industrySettings || incoming.industrySettings) {
    merged.industrySettings = {
      ...current.industrySettings,
      ...incoming.industrySettings,
      ...(current.industrySettings?.education || incoming.industrySettings?.education
        ? {
            education: {
              ...current.industrySettings?.education,
              ...incoming.industrySettings?.education,
            },
          }
        : {}),
      ...(current.industrySettings?.booking || incoming.industrySettings?.booking
        ? {
            booking: {
              ...current.industrySettings?.booking,
              ...incoming.industrySettings?.booking,
            },
          }
        : {}),
      ...(current.industrySettings?.retail || incoming.industrySettings?.retail
        ? {
            retail: {
              ...current.industrySettings?.retail,
              ...incoming.industrySettings?.retail,
            },
          }
        : {}),
    };
  }

  // 3. bankAccount 객체인 경우 병합
  if (
    typeof current.bankAccount === 'object' &&
    current.bankAccount !== null &&
    typeof incoming.bankAccount === 'object' &&
    incoming.bankAccount !== null
  ) {
    merged.bankAccount = {
      ...current.bankAccount,
      ...incoming.bankAccount,
    };
  }

  // 4. 레거시 단일 필드 ↔ industrySettings 파티션 간의 상호 동기화 보존
  if (
    incoming.industrySettings?.education?.defaultTuitionFee !== undefined &&
    incoming.defaultTuitionFee === undefined
  ) {
    merged.defaultTuitionFee = incoming.industrySettings.education.defaultTuitionFee;
  } else if (
    incoming.defaultTuitionFee !== undefined &&
    merged.industrySettings?.education
  ) {
    merged.industrySettings.education.defaultTuitionFee = incoming.defaultTuitionFee;
  }

  if (
    incoming.industrySettings?.booking?.depositEnabled !== undefined &&
    incoming.depositEnabled === undefined
  ) {
    merged.depositEnabled = incoming.industrySettings.booking.depositEnabled;
  } else if (
    incoming.depositEnabled !== undefined &&
    merged.industrySettings?.booking
  ) {
    merged.industrySettings.booking.depositEnabled = incoming.depositEnabled;
  }

  return merged;
}

/** 설정·사용자·온보딩·백업 */
export function createSettingsStorage(api: StorageApi) {
  return {
    getActiveUser(): User {
      return getItem<User>(STORAGE_KEYS.ACTIVE_USER, {
        id: 'owner',
        name: '원장님',
        role: 'owner',
        email: '',
      });
    },

    setActiveUser(user: User): void {
      setItem(STORAGE_KEYS.ACTIVE_USER, user);
    },

    getSettings(): AcademySettings {
      return getItem<AcademySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },

    updateSettings(settings: Partial<AcademySettings>): AcademySettings {
      const current = this.getSettings();
      const updated = mergeOrganizationSettings(current, settings);
      setItem(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    },

    saveSettings(settings: AcademySettings): AcademySettings {
      setItem(STORAGE_KEYS.SETTINGS, settings);
      return settings;
    },

    /**
     * 기존 데이터에 features.attendance.enabled가 없으면 확정 저장.
     * PIN/세션 있으면 true, 없으면 false(MANUAL).
     */
    backfillAttendanceFeatureFlag(): { changed: boolean; enabled: boolean } {
      const settings = this.getSettings();
      const pins = (api.getCustomerPins as () => unknown[])();
      const sessions = (api.getAttendanceSessions as () => unknown[])();
      const hasPinOrSessionData = pins.length > 0 || sessions.length > 0;
      const result = resolveAttendanceEnabledForBackfill({
        settings,
        hasPinOrSessionData,
      });
      if (result.changed) {
        this.saveSettings(result.settings);
      }
      return { changed: result.changed, enabled: result.enabled };
    },

    exportDatabaseJSON(): string {
      const fullDump = {
        students: (api.getStudents as () => unknown[])(),
        parents: (api.getParents as () => unknown[])(),
        teachers: (api.getTeachers as () => unknown[])(),
        classes: (api.getClasses as () => unknown[])(),
        attendance: (api.getAttendance as () => unknown[])(),
        attendanceSessions: (api.getAttendanceSessions as () => unknown[])(),
        customerPins: (api.getCustomerPins as () => unknown[])(),
        parentStudentLinks: (api.getParentStudentLinks as () => unknown[])(),
        invoices: (api.getInvoices as () => unknown[])(),
        expenses: (api.getExpenses as () => unknown[])(),
        incomeEntries: (api.getIncomeEntries as () => unknown[])(),
        consultations: (api.getConsultations as () => unknown[])(),
        practiceRecords: (api.getPracticeRecords as () => unknown[])(),
        lessonRecords: (api.getLessonRecords as () => unknown[])(),
        textbooks: (api.getTextbooks as () => unknown[])(),
        songs: (api.getSongs as () => unknown[])(),
        events: (api.getEvents as () => unknown[])(),
        performanceVideos: (api.getPerformanceVideos as () => unknown[])(),
        notifications: (api.getNotifications as () => unknown[])(),
        settings: (api.getSettings as () => unknown)(),
        careJournals: getItem(STORAGE_KEYS.CARE_JOURNALS, []),
        medicationRequests: getItem(STORAGE_KEYS.MEDICATION_REQUESTS, []),
        childLegalRecords: getItem(STORAGE_KEYS.CARE_CHILD_RECORDS, []),
        careIncidents: getItem(STORAGE_KEYS.CARE_INCIDENTS, []),
        staffHealthCerts: getItem(STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS, []),
        safetyInspectionLogs: getItem(STORAGE_KEYS.CARE_SAFETY_LOGS, []),
        mealSampleLogs: getItem(STORAGE_KEYS.CARE_MEAL_SAMPLES, []),
        cctvViewRequests: getItem(STORAGE_KEYS.CARE_CCTV_REQUESTS, []),
        pickupLogs: getItem(STORAGE_KEYS.CARE_PICKUP_LOGS, []),
        exportedAt: new Date().toISOString(),
      };
      return JSON.stringify(fullDump, null, 2);
    },

    importDatabaseJSON(jsonStr: string): boolean {
      try {
        const data = JSON.parse(jsonStr) as Record<string, unknown>;
        if (data.students) setItem(STORAGE_KEYS.STUDENTS, data.students);
        if (data.parents) setItem(STORAGE_KEYS.PARENTS, data.parents);
        if (data.teachers) setItem(STORAGE_KEYS.TEACHERS, data.teachers);
        if (data.classes) setItem(STORAGE_KEYS.CLASSES, data.classes);
        if (data.attendance) setItem(STORAGE_KEYS.ATTENDANCE, data.attendance);
        if (data.attendanceSessions) setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, data.attendanceSessions);
        if (data.customerPins) setItem(STORAGE_KEYS.CUSTOMER_PINS, data.customerPins);
        if (data.parentStudentLinks) setItem(STORAGE_KEYS.PARENT_STUDENT_LINKS, data.parentStudentLinks);
        if (data.invoices) setItem(STORAGE_KEYS.INVOICES, data.invoices);
        if (data.expenses) setItem(STORAGE_KEYS.EXPENSES, data.expenses);
        if (data.incomeEntries) setItem(STORAGE_KEYS.INCOME_ENTRIES, data.incomeEntries);
        if (data.consultations) setItem(STORAGE_KEYS.CONSULTATIONS, data.consultations);
        if (data.practiceRecords) setItem(STORAGE_KEYS.PRACTICE_RECORDS, data.practiceRecords);
        if (data.lessonRecords) setItem(STORAGE_KEYS.LESSON_RECORDS, data.lessonRecords);
        if (data.textbooks) setItem(STORAGE_KEYS.TEXTBOOKS, data.textbooks);
        if (data.songs) setItem(STORAGE_KEYS.SONGS, data.songs);
        if (data.events) setItem(STORAGE_KEYS.EVENTS, data.events);
        if (data.performanceVideos) setItem(STORAGE_KEYS.PERFORMANCE_VIDEOS, data.performanceVideos);
        if (data.notifications) setItem(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
        if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);
        if (data.careJournals) setItem(STORAGE_KEYS.CARE_JOURNALS, data.careJournals);
        if (data.medicationRequests) setItem(STORAGE_KEYS.MEDICATION_REQUESTS, data.medicationRequests);
        if (data.childLegalRecords) setItem(STORAGE_KEYS.CARE_CHILD_RECORDS, data.childLegalRecords);
        if (data.careIncidents) setItem(STORAGE_KEYS.CARE_INCIDENTS, data.careIncidents);
        if (data.staffHealthCerts) setItem(STORAGE_KEYS.CARE_STAFF_HEALTH_CERTS, data.staffHealthCerts);
        if (data.safetyInspectionLogs) setItem(STORAGE_KEYS.CARE_SAFETY_LOGS, data.safetyInspectionLogs);
        if (data.mealSampleLogs) setItem(STORAGE_KEYS.CARE_MEAL_SAMPLES, data.mealSampleLogs);
        if (data.cctvViewRequests) setItem(STORAGE_KEYS.CARE_CCTV_REQUESTS, data.cctvViewRequests);
        if (data.pickupLogs) setItem(STORAGE_KEYS.CARE_PICKUP_LOGS, data.pickupLogs);
        return true;
      } catch (error) {
        console.error('Import failed:', error);
        return false;
      }
    },

    exportAllData(): string {
      return this.exportDatabaseJSON();
    },

    importAllData(jsonStr: string): boolean {
      return this.importDatabaseJSON(jsonStr);
    },

    isOnboardingComplete(): boolean {
      return getItem<boolean>(STORAGE_KEYS.INITIALIZED, false);
    },

    setOnboardingComplete(complete = true): void {
      setItem(STORAGE_KEYS.INITIALIZED, complete);
      if (complete) {
        const prev = this.getOnboardingProgress();
        if (prev.status !== 'skipped') {
          this.setOnboardingProgress({ status: 'completed', step: prev.step });
        }
      }
    },

    getOnboardingProgress(): OnboardingProgress {
      return getItem<OnboardingProgress>(
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        DEFAULT_ONBOARDING_PROGRESS
      );
    },

    setOnboardingProgress(progress: Partial<OnboardingProgress> & Pick<OnboardingProgress, 'status'>): OnboardingProgress {
      const current = this.getOnboardingProgress();
      const next: OnboardingProgress = {
        ...current,
        ...progress,
        step: typeof progress.step === 'number' ? progress.step : current.step,
        updatedAt: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.ONBOARDING_PROGRESS, next);
      return next;
    },

    markOnboardingSkipped(): void {
      setItem(STORAGE_KEYS.INITIALIZED, true);
      this.setOnboardingProgress({ status: 'skipped', step: 0 });
    },

    markOnboardingCompleted(step = 0): void {
      setItem(STORAGE_KEYS.INITIALIZED, true);
      this.setOnboardingProgress({ status: 'completed', step });
    },

    /** 학생·반이 없으면 초기 설정 대상 (이름만 있어도 표시 — CreateOrganization 이후 가이드용) */
    isEligibleForOnboarding(): boolean {
      const industry = getIndustryType();
      if (isAppointmentIndustry(industry)) {
        return (
          (api.getStudents as () => unknown[])().length === 0 &&
          (api.getServiceOfferings as () => unknown[])().length === 0 &&
          !this.getSettings().name?.trim()
        );
      }
      return (
        (api.getStudents as () => unknown[])().length === 0 &&
        (api.getClasses as () => unknown[])().length === 0
      );
    },

    /** @deprecated isEligibleForOnboarding 사용 권장 */
    isNewOrganization(): boolean {
      return this.isEligibleForOnboarding();
    },

    shouldShowOnboarding(): boolean {
      return !this.isOnboardingComplete() && this.isEligibleForOnboarding();
    },

    /** 진행 중이면 모달 강제 대신 홈 이어하기 카드 */
    shouldAutoOpenOnboarding(): boolean {
      if (!this.shouldShowOnboarding()) return false;
      return this.getOnboardingProgress().status !== 'in_progress';
    },

    shouldShowOnboardingResume(): boolean {
      if (!this.shouldShowOnboarding()) return false;
      return this.getOnboardingProgress().status === 'in_progress';
    },
  };
}

/** Settings / device session persist SoT. */
export const settingsStorage = createSettingsStorage(storageApi);
