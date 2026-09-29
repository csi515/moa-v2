import { PushNotifications } from '@capacitor/push-notifications';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getCapacitorPlatform, isNativeApp } from '@/core/platform/capacitorPlatform';
import { upsertLocalPushToken } from './pushTokenStorage';
import { PENDING_PORTAL_TAB_KEY } from './types';

let listenersAttached = false;
let lastUserId: string | null = null;
let lastOrgId: string | undefined;

async function persistToken(token: string, userId: string, organizationId?: string) {
  const platform = getCapacitorPlatform();
  upsertLocalPushToken({
    token,
    platform: platform === 'web' ? 'web' : platform,
    userId,
    organizationId,
  });

  if (!isSupabaseConfigured()) return;
  try {
    const client = getCoreClient() as unknown as {
      from: (table: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts?: { onConflict?: string }
        ) => Promise<{ error: Error | null }>;
      };
    };
    await client.from('push_device_tokens').upsert(
      {
        user_id: userId,
        organization_id: organizationId || null,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
  } catch {
    /* 스키마 미적용·권한 오류 시 로컬만 유지 */
  }
}

function handleNotificationAction(data: Record<string, unknown> | undefined) {
  const tab = data?.portalTab;
  if (typeof tab === 'string' && tab.trim()) {
    try {
      sessionStorage.setItem(PENDING_PORTAL_TAB_KEY, tab.trim());
    } catch {
      /* ignore */
    }
  }
}

/** 네이티브 앱에서 푸시 권한·토큰 등록 */
export async function registerAppPush(params: {
  userId: string;
  organizationId?: string;
}): Promise<{ registered: boolean; reason?: string }> {
  if (!isNativeApp()) {
    return { registered: false, reason: 'web' };
  }
  if (!params.userId) {
    return { registered: false, reason: 'no_user' };
  }

  lastUserId = params.userId;
  lastOrgId = params.organizationId;

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      return { registered: false, reason: 'denied' };
    }

    if (!listenersAttached) {
      listenersAttached = true;
      await PushNotifications.addListener('registration', (token) => {
        if (!lastUserId) return;
        void persistToken(token.value, lastUserId, lastOrgId);
      });
      await PushNotifications.addListener('registrationError', () => {
        /* 등록 실패는 포털 인앱 알림으로 대체 */
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        handleNotificationAction(event.notification.data as Record<string, unknown> | undefined);
      });
      await PushNotifications.addListener('pushNotificationReceived', () => {
        /* 포그라운드: 포털 알림 피드가 소스 오브 트루스 */
      });
    }

    await PushNotifications.register();
    return { registered: true };
  } catch {
    return { registered: false, reason: 'error' };
  }
}

/** 로그아웃 시 in-memory push 컨텍스트 초기화 (로컬 토큰은 clearLocalPushTokensForUser) */
export function resetAppPushRegistrationContext(): void {
  lastUserId = null;
  lastOrgId = undefined;
}

export function consumePendingPortalTab(): string | null {
  try {
    const tab = sessionStorage.getItem(PENDING_PORTAL_TAB_KEY);
    if (tab) sessionStorage.removeItem(PENDING_PORTAL_TAB_KEY);
    return tab;
  } catch {
    return null;
  }
}
