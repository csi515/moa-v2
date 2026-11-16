/**
 * Supabase Realtime In-App Customer Notifications Hook (비용 0원 통신망)
 * 
 * 외부 유료 알림톡 대신 DB의 core.customer_notifications 테이블과
 * Supabase Realtime 웹소켓을 결합해 실시간 인앱 알림을 수신함.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { callRpc } from '@/shared/kernel';

export interface CustomerNotificationItem {
  id: string;
  organizationId: string;
  customerId: string;
  title: string;
  body: string;
  category: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function useCustomerNotifications(customerId?: string | null) {
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. 초기 알림 목록 로드
  const fetchNotifications = useCallback(async () => {
    if (!customerId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useCustomerNotifications] Fetch failed:', error);
        return;
      }

      const items: CustomerNotificationItem[] = (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        customerId: row.customer_id,
        title: row.title,
        body: row.body,
        category: row.category,
        isRead: Boolean(row.is_read),
        metadata: row.metadata,
        createdAt: row.created_at,
      }));

      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.isRead).length);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  // 2. 초기 로드 (실시간 갱신은 liveProvider 파이프라인에서 통합 처리)
  useEffect(() => {
    if (!customerId) return;
    void fetchNotifications();
  }, [customerId, fetchNotifications]);

  // 3. 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await callRpc(supabase, 'mark_customer_notification_read', {
        p_notification_id: notificationId,
      });
    } catch (err) {
      console.error('[useCustomerNotifications] markAsRead failed:', err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch: fetchNotifications,
    markAsRead,
  };
}
