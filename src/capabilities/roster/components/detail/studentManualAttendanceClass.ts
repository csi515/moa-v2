import type { ClassItem, DayOfWeek } from '@/types';
import { DAY_ATTENDANCE_CLASS_ID } from '@/core/attendance/dayAttendance';

const WEEKDAY_KO: DayOfWeek[] = ['일', '월', '화', '수', '목', '금', '토'];

/** YYYY-MM-DD → 로컬 요일 (UTC 파싱 오차 방지) */
export function weekdayKoFromIsoDate(dateIso: string): DayOfWeek {
  const [y, m, d] = dateIso.split('-').map((n) => parseInt(n, 10));
  const date = new Date(y, (m || 1) - 1, d || 1);
  return WEEKDAY_KO[date.getDay()];
}

/** 선택한 날짜에 수업이 있는 등록 반만 (수동 출결 대상) */
export function getEnrolledClassesOnDate(classes: ClassItem[], dateIso: string): ClassItem[] {
  const day = weekdayKoFromIsoDate(dateIso);
  return classes.filter((cls) => (cls.daysOfWeek || []).includes(day));
}

export type ManualAttendanceClassResolve =
  | { ok: true; classId: string; className: string }
  | { ok: false; reason: 'need_select' };

/**
 * 수동 출결 저장 시 classId/className 결정.
 * - 0개: DAY_ATTENDANCE
 * - 1개: 자동 사용
 * - 2개+: selectedClassId 필수
 */
export function resolveManualAttendanceClass(params: {
  options: ClassItem[];
  selectedClassId: string;
}): ManualAttendanceClassResolve {
  const { options, selectedClassId } = params;
  if (options.length === 0) {
    return { ok: true, classId: DAY_ATTENDANCE_CLASS_ID, className: '일반 수업' };
  }
  if (options.length === 1) {
    return { ok: true, classId: options[0].id, className: options[0].name };
  }
  const selected = options.find((c) => c.id === selectedClassId);
  if (!selected) {
    return { ok: false, reason: 'need_select' };
  }
  return { ok: true, classId: selected.id, className: selected.name };
}

/** 폼 오픈·날짜 변경 시 반 선택값 (다중일 때 유효한 기존 선택 유지) */
export function nextManualAttendanceClassId(
  options: ClassItem[],
  prevSelectedId: string
): string {
  if (options.length === 1) return options[0].id;
  if (options.length === 0) return DAY_ATTENDANCE_CLASS_ID;
  return options.some((c) => c.id === prevSelectedId) ? prevSelectedId : '';
}
