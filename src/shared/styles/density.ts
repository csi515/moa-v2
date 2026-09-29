/**
 * 업무용 UI 밀도 기준 (Medium~High).
 * Tailwind class 관례 — 새 화면은 이 값을 따른다.
 */
export const DENSITY = {
  /** ModuleAppShell main */
  pagePad: 'p-3 sm:p-4 lg:p-5',
  /** 페이지 루트 */
  pageStack: 'space-y-4 pb-4',
  /** 허브 embedded 자식 */
  embeddedStack: 'space-y-4 pb-2',
  sectionGap: 'space-y-4',
  cardPad: 'p-4',
  cardRadius: 'rounded-2xl',
  pageTitle: 'text-lg sm:text-xl font-bold',
} as const;
