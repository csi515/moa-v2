import { createNotificationsStorage } from '@/services/storage/notificationsStorage';
import { getOrganizationId } from '@/services/adapters/storageContext';
import { dispatchAppPush } from '@/core/push';
import type { NotificationType } from '@/core/notices/notificationTypes';

const notifications = createNotificationsStorage();

export function getNotificationsStorage() {
  return notifications;
}

export interface PublishParentAlertStudent {
  id: string;
  name: string;
  parentPhone?: string;
}

export interface PublishParentAlertParams {
  type: Extract<
    NotificationType,
    'absence' | 'makeup' | 'tuition_unpaid' | 'practice' | 'announcement'
  >;
  title: string;
  message: string;
  student: PublishParentAlertStudent;
  scheduledDate?: string;
  portalTab?: string;
  eventKey?: string;
}

/**
 * Core Parent Notification Infrastructure
 * 학부모 포털 알림 저장 및 모바일 앱 푸시 디스패치를 수행합니다.
 */
export function publishParentAlert(params: PublishParentAlertParams): void {
  notifications.saveNotification({
    type: params.type,
    title: params.title,
    message: params.message,
    targetStudentId: params.student.id,
    targetStudentName: params.student.name,
    targetParentPhone: params.student.parentPhone,
    targetGroup: `student:${params.student.id}`,
    recipientCount: 1,
    scheduledDate: params.scheduledDate,
    eventKey: params.eventKey,
    status: 'sent',
    sentAt: new Date().toISOString(),
  });

  const organizationId = getOrganizationId() || undefined;
  void dispatchAppPush({
    title: params.title,
    body: params.message,
    organizationId,
    studentId: params.student.id,
    portalTab: params.portalTab || 'notices',
    type: params.type,
  });
}
