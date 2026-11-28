/**
 * 직원 일정 공개/비공개 마스킹 엔진
 * - is_private / visibility=PRIVATE 일정을 작성자 본인 외 조회 시 마스킹
 * - Core scheduleVisibilityEngine 규칙을 booking capability에서 재사용
 */

import {
  filterAndSanitizeSchedulesForViewer,
  type BaseScheduleEntity,
  type ProcessedScheduleItem,
  type ScheduleVisibility,
  type StaffScheduleProfile,
  type ViewerContext,
} from '@/core/schedules/domain/scheduleVisibilityEngine';

export const PRIVATE_SCHEDULE_MASK_TITLE = '🔒 비공개 일정';

export interface MaskableSchedule extends BaseScheduleEntity {
  /** 레거시/도메인 별칭 — true면 visibility PRIVATE 과 동일 */
  is_private?: boolean;
  title?: string;
  studentName?: string;
  place?: string;
}

export function resolveIsPrivate(schedule: MaskableSchedule): boolean {
  if (schedule.is_private === true) return true;
  return schedule.visibility === 'PRIVATE';
}

/**
 * 타 직원이 조회할 때 비공개 일정의 제목·학생·메모·장소를 숨긴다.
 * 본인/owner/admin 은 원본을 유지한다.
 */
export function maskPrivateSchedule<T extends MaskableSchedule>(
  schedule: T,
  viewer: ViewerContext
): T & { isMasked: boolean; displayTitle: string } {
  const isOwn =
    Boolean(viewer.id) &&
    Boolean(schedule.staffId) &&
    viewer.id === schedule.staffId;
  const isOwnerOrAdmin = viewer.role === 'owner' || viewer.role === 'admin';
  const isPrivate = resolveIsPrivate(schedule);

  if (!isPrivate || isOwn || isOwnerOrAdmin) {
    return {
      ...schedule,
      isMasked: false,
      displayTitle:
        schedule.customerName ||
        schedule.studentName ||
        schedule.title ||
        schedule.serviceName ||
        '일정',
    };
  }

  return {
    ...schedule,
    customerName: undefined,
    studentName: undefined,
    title: PRIVATE_SCHEDULE_MASK_TITLE,
    serviceName: PRIVATE_SCHEDULE_MASK_TITLE,
    memo: undefined,
    place: undefined,
    roomName: undefined,
    customerPhone: undefined,
    isMasked: true,
    displayTitle: PRIVATE_SCHEDULE_MASK_TITLE,
    visibility: 'PRIVATE' as ScheduleVisibility,
  };
}

export function maskPrivateSchedulesForViewer<T extends MaskableSchedule>(params: {
  viewer: ViewerContext;
  schedules: T[];
  staffProfiles?: Map<string, StaffScheduleProfile> | StaffScheduleProfile[];
  selectedStaffIds?: string[];
}): ProcessedScheduleItem<T>[] {
  const normalized = params.schedules.map((s) => ({
    ...s,
    visibility: resolveIsPrivate(s) ? ('PRIVATE' as ScheduleVisibility) : s.visibility,
    customerName: s.customerName || s.studentName,
  }));

  return filterAndSanitizeSchedulesForViewer({
    viewer: params.viewer,
    schedules: normalized,
    staffProfiles: params.staffProfiles ?? [],
    viewMode: params.selectedStaffIds?.length ? 'custom_staff' : 'all',
    selectedStaffIds: params.selectedStaffIds,
  }).map((item) => {
    if (item.visibility === 'PRIVATE' && item.isMasked) {
      return {
        ...item,
        displayTitle: PRIVATE_SCHEDULE_MASK_TITLE,
        sanitized: {
          ...item.sanitized,
          customerName: PRIVATE_SCHEDULE_MASK_TITLE,
          serviceName: PRIVATE_SCHEDULE_MASK_TITLE,
          memo: undefined,
        },
      };
    }
    // PRIVATE that was fully hidden by filter: already excluded
    if (!item.isOwnSchedule && !item.isOwnerOrAdmin && resolveIsPrivate(item.original)) {
      return {
        ...item,
        isMasked: true,
        displayTitle: PRIVATE_SCHEDULE_MASK_TITLE,
      };
    }
    return item;
  });
}
