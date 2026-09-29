import type { AppNotification } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem } from './helpers';

/** 알림 CRUD */
export function createNotificationsStorage() {
  return {
    getNotifications(): AppNotification[] {
      return getItem<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    },

    saveNotification(
      notification: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }
    ): AppNotification {
      const list = this.getNotifications();
      const now = new Date().toISOString();
      let saved: AppNotification;

      if (notification.id) {
        const idx = list.findIndex((entry) => entry.id === notification.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...notification, id: notification.id };
          list[idx] = saved;
        } else {
          saved = { ...notification, id: notification.id, createdAt: now };
          list.unshift(saved);
        }
      } else {
        saved = { ...notification, id: generateEntityId('notif'), createdAt: now };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.NOTIFICATIONS, list);
      return saved;
    },

    sendNotification(id: string): boolean {
      const list = this.getNotifications();
      const idx = list.findIndex((entry) => entry.id === id);
      if (idx < 0) return false;
      list[idx] = {
        ...list[idx],
        status: 'sent',
        sentAt: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.NOTIFICATIONS, list);
      return true;
    },

    deleteNotification(id: string): boolean {
      const list = this.getNotifications();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.NOTIFICATIONS, list);
      return true;
    },
  };
}
