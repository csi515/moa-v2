import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { applyDeepLinkFromString, bootstrapWebDeepLinks } from './bootstrapDeepLinks';
import { isNativeApp } from './capacitorPlatform';
import { registerForegroundStep, runForegroundResume } from './foregroundCoordinator';
import {
  attachNativeAppLifecycle,
  pauseSupabaseAuthOnBackground,
  resolveNativeColdStartUrl,
  resumeSupabaseAuthOnForeground,
} from './mobileLifecycle';
import { registerAppPush } from '@/core/push';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * 네이티브 초기화 orchestration만 담당.
 * - Deep link: bootstrapDeepLinks / cold start launchUrl / appUrlOpen
 * - Lifecycle: mobileLifecycle + foregroundCoordinator
 * - Push: user·org 준비 후 registerAppPush (셸에서도 재등록 가능)
 * 웹: bootstrapWebDeepLinks만 — 기존과 동일.
 */
export function MobileBootstrap() {
  const { user } = useAuth();
  const org = useOptionalOrganization();
  const organizationId = org?.currentOrganization?.id;

  // 웹 deep link / 네이티브 UI·lifecycle (1회)
  useEffect(() => {
    if (!isNativeApp()) {
      bootstrapWebDeepLinks();
      return;
    }

    let removed = false;
    let detach: (() => void) | undefined;
    const unregisterAuth = registerForegroundStep('auth', () =>
      resumeSupabaseAuthOnForeground()
    );

    const initNative = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#4f46e5' });
      } catch {
        /* 웹 번들 포함 시 무시 */
      }
      try {
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }

      const coldUrl = await resolveNativeColdStartUrl();
      if (coldUrl) applyDeepLinkFromString(coldUrl);

      // 이미 active인 cold start에서도 auto-refresh 가동
      await resumeSupabaseAuthOnForeground();

      const handles = await attachNativeAppLifecycle({
        onUrlOpen: (url) => applyDeepLinkFromString(url),
        onBackground: () => {
          void pauseSupabaseAuthOnBackground();
        },
        onForeground: () => {
          void runForegroundResume();
        },
      });
      if (removed) {
        handles.remove();
        return;
      }
      detach = handles.remove;
    };

    void initNative();

    return () => {
      removed = true;
      unregisterAuth();
      detach?.();
    };
  }, []);

  // Push: 로그인·org 전환 시 즉시 등록. foreground는 coordinator가 1회만 호출.
  useEffect(() => {
    if (!isNativeApp() || !isSupabaseConfigured() || !user?.id) return;
    const register = () => {
      void registerAppPush({
        userId: user.id,
        organizationId: organizationId || undefined,
      });
    };
    register();
    return registerForegroundStep('push', register);
  }, [user?.id, organizationId]);

  return null;
}
