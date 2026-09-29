import type { AppNotification, Student } from '@/types';
import { isParentNoticeType, isParentPortalNotificationType } from './types';
import { parseNoticeTarget } from './noticeTarget';

/** 가정통신문·안내장만 추림 */
export function filterParentNotices(list: AppNotification[]): AppNotification[] {
  return list.filter((n) => isParentNoticeType(n.type));
}

/** 학부모 포털 피드 — 안내장 + 출결 알림 */
export function filterParentPortalNotifications(list: AppNotification[]): AppNotification[] {
  return list.filter((n) => isParentPortalNotificationType(n.type));
}

function matchesStudentTarget(n: AppNotification, student: Student): boolean {
  if (
    n.type === 'attendance' ||
    n.type === 'absence' ||
    n.type === 'makeup' ||
    n.type === 'tuition_unpaid'
  ) {
    return n.targetStudentId === student.id;
  }

  const { mode, id } = parseNoticeTarget(n.targetGroup);
  if (mode === 'none') return false;
  if (mode === 'all') return true;
  if (mode === 'student') {
    return (id || n.targetStudentId) === student.id;
  }
  if (mode === 'class' && id) {
    return (student.classIds || []).includes(id);
  }
  if (n.targetStudentId) return n.targetStudentId === student.id;
  return false;
}

/** 학부모 포털 — 해당 원아/회원에게 보이는 게시된 안내·출결 알림 */
export function getPortalFeedForStudent(
  list: AppNotification[],
  student: Student
): AppNotification[] {
  return filterParentPortalNotifications(list)
    .filter((n) => n.status === 'sent')
    .filter((n) => matchesStudentTarget(n, student))
    .sort((a, b) => (b.sentAt || b.createdAt || '').localeCompare(a.sentAt || a.createdAt || ''));
}

/** @deprecated getPortalFeedForStudent 사용 */
export function getNoticesForStudent(
  list: AppNotification[],
  student: Student
): AppNotification[] {
  return getPortalFeedForStudent(list, student);
}

/** 발송 대상 목록 */
export function resolveNoticeRecipients(
  students: Student[],
  mode: 'all' | 'class' | 'student',
  targetId?: string
): Student[] {
  const active = students.filter((s) => s.status === 'active');
  if (mode === 'all') return active;
  if (mode === 'class' && targetId) {
    return active.filter((s) => (s.classIds || []).includes(targetId));
  }
  if (mode === 'student' && targetId) {
    return active.filter((s) => s.id === targetId);
  }
  return [];
}
