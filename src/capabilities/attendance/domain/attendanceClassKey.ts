import { DAY_ATTENDANCE_CLASS_ID } from './dayAttendance';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 수업 UUID만 service_id에 넣는다. c-default 등 sentinel은 metadata.classId. */
export function isAttendanceServiceUuid(value: string | null | undefined): boolean {
  return UUID_RE.test((value || '').trim());
}

/**
 * 출결 canonical business key의 class 부분.
 * DAY_ATTENDANCE(service_id NULL, classId=c-default)와 수업 출결이 같은 날 공존한다.
 */
export function attendanceClassKey(
  classId?: string | null,
  serviceId?: string | null
): string {
  const service = (serviceId || '').trim();
  if (isAttendanceServiceUuid(service)) return service;
  const cls = (classId || '').trim();
  if (cls) return cls;
  return DAY_ATTENDANCE_CLASS_ID;
}

export function isDayAttendanceClassId(classId?: string | null): boolean {
  return attendanceClassKey(classId) === DAY_ATTENDANCE_CLASS_ID;
}
