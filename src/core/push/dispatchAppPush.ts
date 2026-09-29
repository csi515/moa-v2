import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { AppPushPayload } from './types';

/**
 * 포털 인앱 알림과 같은 이벤트를 앱 푸시로 전달.
 * 실패해도 포털 알림은 유지. 카카오·SMS는 호출하지 않음.
 */
export async function dispatchAppPush(payload: AppPushPayload): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (!payload.organizationId || !payload.studentId) return;

  try {
    await getCoreClient().functions.invoke('send-app-push', {
      body: {
        organizationId: payload.organizationId,
        studentId: payload.studentId,
        title: payload.title,
        body: payload.body,
        data: {
          portalTab: payload.portalTab || 'notices',
          type: payload.type || 'notice',
          studentId: payload.studentId,
        },
      },
    });
  } catch {
    /* Edge/FCM 미설정 시 무시 — 인앱 알림만으로도 동작 */
  }
}
