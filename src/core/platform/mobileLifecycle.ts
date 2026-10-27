import { App as CapApp } from '@capacitor/app';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { isNativeApp } from './capacitorPlatform';
import { shouldRefreshSession } from './mobileLifecyclePolicy';

export { shouldRefreshSession } from './mobileLifecyclePolicy';

/** foreground 복귀 — Org soft refresh / offline hydrate 재시도 등 */
export const MOBILE_FOREGROUND_EVENT = 'moa:mobile-foreground';

export function notifyMobileForeground(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MOBILE_FOREGROUND_EVENT));
}

/** background에서 타이머가 멈추므로 foreground에서 auto-refresh 재개 + 필요 시 refresh */
export async function resumeSupabaseAuthOnForeground(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = getCoreClient();
    client.auth.startAutoRefresh();
    const { data } = await client.auth.getSession();
    const session = data.session;
    if (!session) return;
    if (shouldRefreshSession(session.expires_at)) {
      await client.auth.refreshSession();
    }
  } catch {
    /* offline · 만료 — AuthProvider onAuthStateChange가 후속 처리 */
  }
}

export async function pauseSupabaseAuthOnBackground(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    getCoreClient().auth.stopAutoRefresh();
  } catch {
    /* ignore */
  }
}

/** cold start deep link: getLaunchUrl 우선, 없으면 현재 href */
export async function resolveNativeColdStartUrl(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const launch = await CapApp.getLaunchUrl();
    if (launch?.url) return launch.url;
  } catch {
    /* 미지원 플랫폼 */
  }
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return null;
}

export type NativeLifecycleHandles = {
  remove: () => void;
};

/**
 * appStateChange + appUrlOpen 구독.
 * onForeground는 debounce 없이 호출측에서 조율한다.
 */
export async function attachNativeAppLifecycle(handlers: {
  onForeground: () => void;
  onBackground?: () => void;
  onUrlOpen: (url: string) => void;
}): Promise<NativeLifecycleHandles> {
  const stateHandle = await CapApp.addListener('appStateChange', (state) => {
    if (state.isActive) handlers.onForeground();
    else handlers.onBackground?.();
  });
  const urlHandle = await CapApp.addListener('appUrlOpen', (event) => {
    if (event.url) handlers.onUrlOpen(event.url);
  });
  return {
    remove: () => {
      void stateHandle.remove();
      void urlHandle.remove();
    },
  };
}
