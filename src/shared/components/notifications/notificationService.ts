import type { MoaNotification } from './notificationTypes';

const STORAGE_KEY = 'moa_notifications_v1';
const NOTIFICATION_EVENT = 'moa_notification_update';

function getInitialSampleNotifications(): MoaNotification[] {
  const now = Date.now();
  return [
    {
      id: 'notif-1',
      type: 'attendance',
      priority: 'success',
      title: '김민준 원생 등원 완료',
      message: '체르니 30 클래스 등원 확인되었습니다. (15:28)',
      createdAt: new Date(now - 12 * 60 * 1000).toISOString(),
      read: false,
      linkTab: 'attendance',
    },
    {
      id: 'notif-2',
      type: 'payment',
      priority: 'info',
      title: '수강료 결제 완료 알림',
      message: '이지원 원생 11월 피아노 정규반 수강료 180,000원이 카드 결제되었습니다.',
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      read: false,
      linkTab: 'billing',
    },
    {
      id: 'notif-3',
      type: 'booking',
      priority: 'info',
      title: '그랜드 1번 연습실 예약 확정',
      message: '박서현 학생 17:00 ~ 18:00 그랜드 1번 연습실 예약이 확정되었습니다.',
      createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
      read: false,
      linkTab: 'seat_room',
    },
    {
      id: 'notif-4',
      type: 'payment',
      priority: 'warning',
      title: '수강료 납부 기한 D-2',
      message: '정시우 학생의 11월 수강료 결제 마감일이 이틀 남았습니다. 카카오 알림톡을 발송할 수 있습니다.',
      createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
      read: true,
      linkTab: 'billing',
    },
    {
      id: 'notif-5',
      type: 'system',
      priority: 'info',
      title: '정기 클라우드 동기화 완료',
      message: '모든 출결 및 수강료 원장이 클라우드에 안전하게 동기화되었습니다.',
      createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
      read: true,
      linkTab: 'dashboard',
    },
  ];
}

export const MoaNotificationService = {
  getNotifications(): MoaNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = getInitialSampleNotifications();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return [];
    } catch {
      return [];
    }
  },

  getUnreadCount(): number {
    const list = this.getNotifications();
    return list.filter((n) => !n.read).length;
  },

  saveNotifications(list: MoaNotification[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
    } catch (e) {
      console.error('[MoaNotificationService] save failed', e);
    }
  },

  markAsRead(id: string): void {
    const list = this.getNotifications();
    const updated = list.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    this.saveNotifications(updated);
  },

  markAllAsRead(): void {
    const list = this.getNotifications();
    const updated = list.map((item) => ({ ...item, read: true }));
    this.saveNotifications(updated);
  },

  addNotification(
    item: Omit<MoaNotification, 'id' | 'createdAt' | 'read'>
  ): MoaNotification {
    const newNotif: MoaNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const current = this.getNotifications();
    this.saveNotifications([newNotif, ...current]);
    return newNotif;
  },

  deleteNotification(id: string): void {
    const list = this.getNotifications();
    const updated = list.filter((item) => item.id !== id);
    this.saveNotifications(updated);
  },

  clearAll(): void {
    this.saveNotifications([]);
  },

  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(NOTIFICATION_EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  },
};
