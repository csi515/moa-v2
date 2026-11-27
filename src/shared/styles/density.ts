/**
 * Moa-v2 통일된 UI 디자인 토큰 및 밀도 규격 (Design Tokens & Density Standard)
 * Tailwind class 관례 — 모든 신규 및 개편 컴포넌트는 이 규격을 준수합니다.
 */

export const DENSITY = {
  /** ModuleAppShell main */
  pagePad: 'p-3 sm:p-4 lg:p-5',
  /** 페이지 루트 스택 */
  pageStack: 'space-y-4 pb-4',
  /** 허브 embedded 자식 */
  embeddedStack: 'space-y-4 pb-2',
  sectionGap: 'space-y-4',
  cardPad: 'p-4 sm:p-5',
  cardRadius: 'rounded-2xl',
  pageTitle: 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight',
} as const;

/** 3대 표준 높이 및 터치 타겟 규격 (W3C / Apple HIG 최소 터치타겟 준수) */
export const UI_SIZES = {
  sm: {
    height: 'min-h-[36px] h-9',
    text: 'text-xs',
    padding: 'px-3 py-1.5',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  md: {
    height: 'min-h-[44px] h-11',
    text: 'text-sm',
    padding: 'px-4 py-2.5',
    icon: 'w-4 h-4',
    gap: 'gap-2',
  },
  lg: {
    height: 'min-h-[48px] h-12',
    text: 'text-sm sm:text-base font-bold',
    padding: 'px-5 py-3',
    icon: 'w-5 h-5',
    gap: 'gap-2.5',
  },
} as const;

/** 중첩 곡률 규격 (Nested Radius System) */
export const UI_RADIUS = {
  modal: 'rounded-3xl',        // 24px: 최상위 대형 모달 / 시트
  card: 'rounded-2xl',         // 16px: 카드, 테이블 컨테이너, 섹션 박스
  control: 'rounded-xl',       // 12px: 버튼, 입력창, 드롭다운 셀렉트
  badge: 'rounded-lg',         // 8px: 사각형 뱃지, 미니 태그
  pill: 'rounded-full',        // 알약형 완전 둥근 뱃지
} as const;

/** 타이포그래피 계층 규격 (초소형 10px 남발 방지) */
export const UI_TYPOGRAPHY = {
  h1: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight',
  h2: 'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight',
  h3: 'text-lg sm:text-xl font-bold text-slate-900 tracking-tight',
  h4: 'text-base font-bold text-slate-900',
  body: 'text-sm text-slate-700 leading-relaxed',
  bodyMuted: 'text-xs text-slate-500 leading-normal',
  caption: 'text-xs font-semibold text-slate-600',
  meta: 'text-[11px] text-slate-400',
} as const;

/** 데스크톱 화면 최대 너비 및 중앙 정렬 위계 (Desktop Container Hierarchy) */
export const DESKTOP_CONTAINERS = {
  /** 단일 폼, 계정/비밀번호 변경, 단순 설정 상세 (~672px) */
  form: 'max-w-2xl mx-auto w-full',
  /** 설정 허브, 법정 서식, 단일 리포트, 체크리스트 (~896px) */
  content: 'max-w-4xl mx-auto w-full',
  /** 대시보드, 지표 관제 위젯, 통계 차트 (~1152px) */
  dashboard: 'max-w-6xl mx-auto w-full',
  /** POS 판매대, 학생/고객 대형 명부, 마스터-디테일 스플릿 뷰 (~1280px) */
  wide: 'max-w-7xl mx-auto w-full',
} as const;

/** 데스크톱/태블릿 반응형 그리드 토큰 (Responsive Grid Tokens) */
export const RESPONSIVE_GRIDS = {
  /** 일반 정보/엔티티 카드 3열 그리드 */
  cards: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4',
  /** 콤팩트 카드/상품/교재 4열 그리드 */
  cardsDense: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3',
  /** 대시보드 상단 핵심 지표 요약 4열 그리드 */
  metrics: 'grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3',
  /** 설정 메뉴/타일 버튼 2열 그리드 */
  settings: 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5',
  /** 입력 폼 2열 그리드 */
  form2Col: 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4',
  /** 마스터(좌 4~5) - 디테일(우 7~8) 12그리드 분할 스플릿 */
  splitView: 'grid grid-cols-1 lg:grid-cols-12 gap-5',
} as const;

