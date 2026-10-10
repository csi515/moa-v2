import { useState, useEffect, useCallback } from "react";
import { getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/core/auth/AuthProvider";
import { useOrganization } from "@/core/organizations/OrganizationProvider";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export interface UseWebPushReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function useWebPush(): UseWebPushReturn {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Service Worker 등록 확인 및 기존 구독 상태 점검
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => {
          setIsSubscribed(!!subscription);
        })
        .catch(() => {
          setIsSubscribed(false);
        });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("이 브라우저는 웹 푸시를 지원하지 않습니다.");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 알림 권한 요청
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError("알림 권한이 거부되었습니다.");
        setLoading(false);
        return false;
      }

      // 2. Service Worker 등록
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. VAPID 공개키 확인 (환경변수 또는 데모용 표준 공개키)
      const vapidPublicKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY ||
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

      const subOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      };

      const subscription = await registration.pushManager.subscribe(subOptions);

      const endpoint = subscription.endpoint;
      const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
      const auth = arrayBufferToBase64(subscription.getKey("auth"));

      // 4. Supabase DB에 구독 정보 동기화
      if (isSupabaseConfigured() && user) {
        const client = getCoreClient();
        const tenantId = currentOrganization?.id || null;

        await client.from("web_push_subscriptions").upsert(
          {
            tenant_id: tenantId,
            user_id: user.id,
            endpoint,
            p256dh,
            auth,
          },
          { onConflict: "endpoint" }
        );
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "푸시 구독에 실패했습니다.";
      setError(msg);
      setLoading(false);
      return false;
    }
  }, [isSupported, user, currentOrganization]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (isSupabaseConfigured()) {
          const client = getCoreClient();
          await client.from("web_push_subscriptions").delete().eq("endpoint", endpoint);
        }
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "구독 해제에 실패했습니다.";
      setError(msg);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
