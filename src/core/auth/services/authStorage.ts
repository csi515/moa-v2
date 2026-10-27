import type { SupportedStorage } from '@supabase/supabase-js';

export const AUTH_STORAGE_KEY_PREFERENCE = 'moa:auth:remember_me';

// SSR / 테스트 환경용 인메모리 저장소
const memoryStore = new Map<string, string>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * 로그인 유지(rememberMe) 선호도 조회
 * - 기본값: true (기존 데스크톱/모바일 앱 사용자 경험 유지)
 * - 공용 태블릿/패드/키오스크 모드 시 false로 설정되어 브라우저 종료 시 세션 즉시 소멸
 */
export function getAuthStoragePreference(): boolean {
  if (!isBrowser()) {
    const val = memoryStore.get(AUTH_STORAGE_KEY_PREFERENCE);
    return val !== 'false';
  }

  try {
    const sessionPref = window.sessionStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE);
    if (sessionPref !== null) {
      return sessionPref === 'true';
    }
    const localPref = window.localStorage.getItem(AUTH_STORAGE_KEY_PREFERENCE);
    if (localPref !== null) {
      return localPref === 'true';
    }
  } catch {
    // 스토리지 접근 차단 환경 (프라이빗 브라우징 등)
  }

  return true;
}

/**
 * 로그인 유지(rememberMe) 선호도 설정
 * @param remember true면 localStorage, false면 sessionStorage 활성화
 */
export function setAuthStoragePreference(remember: boolean): void {
  const valueStr = remember ? 'true' : 'false';

  if (!isBrowser()) {
    memoryStore.set(AUTH_STORAGE_KEY_PREFERENCE, valueStr);
    return;
  }

  try {
    if (remember) {
      window.localStorage.setItem(AUTH_STORAGE_KEY_PREFERENCE, 'true');
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY_PREFERENCE);
    } else {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY_PREFERENCE, 'false');
      window.localStorage.removeItem(AUTH_STORAGE_KEY_PREFERENCE);
    }
  } catch {
    // 스토리지 접근 오류 방어
  }
}

/**
 * Supabase Auth용 동적 스토리지 어댑터 (Dynamic SupportedStorage)
 * - rememberMe가 true면 localStorage를 주 저장소로 사용 (앱 재시작 후에도 로그인 유지)
 * - rememberMe가 false면 sessionStorage를 주 저장소로 사용 (공용 패드 보안: 탭/창 종료 시 증발)
 * - 읽기는 안전하게 양쪽 스토리지(sessionStorage 우선)를 폴백 조회
 */
export const dynamicAuthStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) {
      return memoryStore.get(key) ?? null;
    }

    try {
      // 1. 공용 패드 세션이 활성화된 경우 sessionStorage 우선 조회
      const sessionVal = window.sessionStorage.getItem(key);
      if (sessionVal !== null) {
        return sessionVal;
      }

      // 2. 일반 세션인 경우 localStorage 조회
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isBrowser()) {
      memoryStore.set(key, value);
      return;
    }

    const remember = getAuthStoragePreference();

    try {
      if (remember) {
        // 일반 로그인: localStorage에 기록하고 sessionStorage의 잔존 키 정리
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        // 공용 기기 모드: sessionStorage에만 기록하고 localStorage의 잔존 키 파기
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn('[dynamicAuthStorage] Failed to setItem:', err);
    }
  },

  removeItem: (key: string): void => {
    if (!isBrowser()) {
      memoryStore.delete(key);
      return;
    }

    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn('[dynamicAuthStorage] Failed to removeItem:', err);
    }
  },
};
