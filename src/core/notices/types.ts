/** 가정통신문·안내장·출결·보강·미납 알림으로 쓰는 알림 유형 */
import type { NotificationType } from './notificationTypes';

export type { AppNotification, NotificationItem, NotificationType } from './notificationTypes';

export type ParentNoticeKind = Extract<NotificationType, 'notice' | 'announcement'>;

export type ParentPortalNotificationKind = Extract<
  NotificationType,
  'notice' | 'announcement' | 'attendance' | 'absence' | 'makeup' | 'tuition_unpaid' | 'practice'
>;

export type NoticeTargetMode = 'all' | 'class' | 'student';

export const PARENT_NOTICE_KIND_LABEL: Record<ParentNoticeKind, string> = {
  notice: '가정통신문',
  announcement: '안내장',
};

export const PARENT_PORTAL_NOTIFICATION_LABEL: Record<ParentPortalNotificationKind, string> = {
  notice: '가정통신문',
  announcement: '안내장',
  attendance: '출결',
  absence: '결석',
  makeup: '보강',
  tuition_unpaid: '미납',
  practice: '연습',
};

export function isParentNoticeType(type: NotificationType): type is ParentNoticeKind {
  return type === 'notice' || type === 'announcement';
}

export function isParentPortalNotificationType(
  type: NotificationType
): type is ParentPortalNotificationKind {
  return (
    type === 'notice' ||
    type === 'announcement' ||
    type === 'attendance' ||
    type === 'absence' ||
    type === 'makeup' ||
    type === 'tuition_unpaid' ||
    type === 'practice'
  );
}
