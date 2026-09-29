export type NotificationType =
  | 'notice'
  | 'attendance'
  | 'tuition_due'
  | 'tuition_unpaid'
  | 'absence'
  | 'makeup'
  | 'consultation'
  | 'announcement'
  | 'practice';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetGroup?: string;
  recipientCount?: number;
  targetStudentId?: string;
  targetStudentName?: string;
  targetParentPhone?: string;
  scheduledDate?: string;
  eventKey?: string;
  status?: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  createdAt?: string;
}

export type AppNotification = NotificationItem;
