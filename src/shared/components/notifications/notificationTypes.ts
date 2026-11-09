export type NotificationType =
  | 'attendance'
  | 'payment'
  | 'booking'
  | 'system'
  | 'message';

export type NotificationPriority = 'info' | 'success' | 'warning' | 'urgent';

export interface MoaNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string; // ISO 8601 string
  read: boolean;
  linkTab?: string;
  linkPayload?: Record<string, unknown>;
}
