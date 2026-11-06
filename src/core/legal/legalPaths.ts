import { isNativeApp } from '@/core/platform';

export type LegalPageId = 'privacy' | 'terms' | 'support' | 'pricing';

export function getPublicLegalPage(): LegalPageId | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (hash === 'privacy' || hash === 'terms' || hash === 'support' || hash === 'pricing') {
    return hash;
  }

  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/privacy' || path.endsWith('/privacy')) return 'privacy';
  if (path === '/terms' || path.endsWith('/terms')) return 'terms';
  if (path === '/support' || path.endsWith('/support')) return 'support';
  if (path === '/pricing' || path.endsWith('/pricing')) return 'pricing';

  return null;
}

/** 스토어 등록·외부 공유용 공개 URL */
export function legalPagePublicHref(page: LegalPageId): string {
  return `/${page}`;
}

/** 앱 내 링크 — 네이티브는 hash, 웹은 pathname */
export function legalPageHref(page: LegalPageId): string {
  if (isNativeApp()) return `#/${page}`;
  return legalPagePublicHref(page);
}
