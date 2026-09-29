import { parseStaffLinkCode } from './deepLinkParser';

const PENDING_STAFF_LINK_KEY = 'moa_pending_staff_link';

export function storePendingStaffLink(token: string): void {
  sessionStorage.setItem(PENDING_STAFF_LINK_KEY, token.trim().toUpperCase());
}

/** 로그인 세션 중 staff_link 딥링크 수신 시 수락 모달을 띄우기 위한 이벤트 */
export const STAFF_LINK_PENDING_EVENT = 'moa:staff-link-pending';

export function peekPendingStaffLink(): string | null {
  try {
    return sessionStorage.getItem(PENDING_STAFF_LINK_KEY);
  } catch {
    return null;
  }
}

export function clearPendingStaffLink(): void {
  try {
    sessionStorage.removeItem(PENDING_STAFF_LINK_KEY);
  } catch {
    // ignore
  }
}

export function notifyStaffLinkPending(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STAFF_LINK_PENDING_EVENT));
  }
}

export function consumePendingStaffLink(): string | null {
  const token = sessionStorage.getItem(PENDING_STAFF_LINK_KEY);
  if (token) sessionStorage.removeItem(PENDING_STAFF_LINK_KEY);
  return token;
}

export function parseStaffLinkFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('staff_link');
  if (raw !== null) {
    const url = new URL(window.location.href);
    url.searchParams.delete('staff_link');
    window.history.replaceState({}, '', url.pathname + url.search);
  }
  return parseStaffLinkCode(raw);
}
