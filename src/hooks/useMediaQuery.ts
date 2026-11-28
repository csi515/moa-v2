import { useEffect, useState } from 'react';
import { VIEWPORT_BREAKPOINTS } from '@/shared/styles/density';

/** Tailwind md 브레이크포인트(768px) 이상 여부 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

const MD_UP = `(min-width: ${VIEWPORT_BREAKPOINTS.mdMin}px)`;
const LG_UP = `(min-width: ${VIEWPORT_BREAKPOINTS.lgMin}px)`;

/** Phone: 너비 < 768px */
export function useIsPhone(): boolean {
  return !useMediaQuery(MD_UP);
}

/**
 * Tablet: 768px ≤ 너비 < 1024px
 * — 앱 크롬은 Phone과 동일, 콘텐츠 밀도는 md 그리드/테이블
 */
export function useIsTablet(): boolean {
  const mdUp = useMediaQuery(MD_UP);
  const lgUp = useMediaQuery(LG_UP);
  return mdUp && !lgUp;
}

/**
 * Desktop 레이아웃 크롬: 너비 ≥ 1024px
 * — 사이드바, Master-Detail 스플릿, 호버·드래그 그리드 등
 */
export function useIsDesktopLayout(): boolean {
  return useMediaQuery(LG_UP);
}

/** md(768px) 이상 — Tablet + Desktop 콘텐츠 밀도 */
export function useIsMdUp(): boolean {
  return useMediaQuery(MD_UP);
}

/**
 * @deprecated 이름이 Desktop이지만 실제로는 md(768+)이다.
 * 신규 코드: 콘텐츠 밀도 → `useIsMdUp`, 사이드바/스플릿 → `useIsDesktopLayout`
 */
export function useIsDesktop(): boolean {
  return useIsMdUp();
}
