import { Capacitor } from '@capacitor/core';

/** Capacitor 네이티브 앱(iOS/Android) 여부 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** 브라우저/PWA 환경 */
export function isWebApp(): boolean {
  return !Capacitor.isNativePlatform();
}

export function isIOSApp(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function getCapacitorPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}
