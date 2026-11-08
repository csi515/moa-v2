/**
 * Favorite Menu Quick Dock Helpers & Catalog
 *
 * 원장님이 매일 쓰는 메뉴만 골라 상단 퀵 독(Dock)에 고정하고
 * 1초 만에 직행할 수 있도록 지원하는 즐겨찾기 도메인 유틸리티.
 */

export interface AvailableMenuItem {
  tab: string;
  label: string;
  description: string;
  category: 'core' | 'finance' | 'specialty';
  iconType:
    | 'home'
    | 'users'
    | 'calendar'
    | 'check_circle'
    | 'credit_card'
    | 'book_open'
    | 'message'
    | 'music'
    | 'award'
    | 'package'
    | 'wallet';
}

/** 즐겨찾기로 등록 가능한 피아노 학원 전체 메뉴 카탈로그 */
export const PIANO_AVAILABLE_MENU_CATALOG: readonly AvailableMenuItem[] = [
  // 1. 핵심 학원 업무
  {
    tab: 'dashboard',
    label: '원장실 홈',
    description: '오늘의 학원 브리핑 및 실시간 현황',
    category: 'core',
    iconType: 'home',
  },
  {
    tab: 'attendance',
    label: '출결 관리',
    description: '오늘 등원/하원 실시간 체크 및 기록',
    category: 'core',
    iconType: 'check_circle',
  },
  {
    tab: 'timetable',
    label: '수업 시간표',
    description: '요일·시간대별 원생 배정 및 변경',
    category: 'core',
    iconType: 'calendar',
  },
  {
    tab: 'students',
    label: '원생 명부',
    description: '재원생/퇴원생 조회 및 신규 등록',
    category: 'core',
    iconType: 'users',
  },
  {
    tab: 'consultations',
    label: '상담 일지',
    description: '학부모 상담 예약 및 문의 내역',
    category: 'core',
    iconType: 'message',
  },

  // 2. 수강료 및 학원 장부
  {
    tab: 'tuition',
    label: '수강료 수납',
    description: '월별 원비 청구 고지 및 즉시 수납',
    category: 'finance',
    iconType: 'credit_card',
  },
  {
    tab: 'unpaid',
    label: '미납 원생 관리',
    description: '미납 내역 조회 및 수납 독촉',
    category: 'finance',
    iconType: 'wallet',
  },
  {
    tab: 'finance',
    label: '학원 장부 (수입·지출)',
    description: '학원 수입, 지출 및 강사 정산',
    category: 'finance',
    iconType: 'wallet',
  },

  // 3. 학원 전문 기능
  {
    tab: 'practice',
    label: '피아노 연습실',
    description: '연습실 빈방 현황 및 연습 시간 기록',
    category: 'specialty',
    iconType: 'music',
  },
  {
    tab: 'textbooks',
    label: '교재 및 재고',
    description: '바이엘·체르니 교재 판매 및 수불',
    category: 'specialty',
    iconType: 'book_open',
  },
  {
    tab: 'song-progress',
    label: '진도표 & 완곡 스탬프',
    description: '원생별 진도 및 완곡 칭찬 스탬프',
    category: 'specialty',
    iconType: 'award',
  },
  {
    tab: 'family',
    label: '형제자매 패밀리 수납',
    description: '형제 묶음 결제 및 가족 할인 관리',
    category: 'specialty',
    iconType: 'users',
  },
] as const;

/** 원장님이 가장 자주 쓰는 기본 6대 최애 메뉴 프리셋 */
export const DEFAULT_PIANO_FAVORITE_TABS: readonly string[] = [
  'dashboard',
  'attendance',
  'timetable',
  'tuition',
  'practice',
  'students',
];

export const MAX_FAVORITE_DOCK_ITEMS = 6;
export const STORAGE_KEY_PIANO_FAVORITES = 'moa_piano_favorite_dock_v1';

/**
 * 로컬 스토리지에서 저장된 즐겨찾기 탭 목록을 불러옵니다.
 */
export function loadFavoriteTabs(storageKey = STORAGE_KEY_PIANO_FAVORITES): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [...DEFAULT_PIANO_FAVORITE_TABS];
    }
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...DEFAULT_PIANO_FAVORITE_TABS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_PIANO_FAVORITE_TABS];
    }
    const validTabs = new Set(PIANO_AVAILABLE_MENU_CATALOG.map((m) => m.tab));
    const filtered = parsed.filter((t) => typeof t === 'string' && validTabs.has(t));
    return filtered.length > 0 ? filtered.slice(0, MAX_FAVORITE_DOCK_ITEMS) : [...DEFAULT_PIANO_FAVORITE_TABS];
  } catch {
    return [...DEFAULT_PIANO_FAVORITE_TABS];
  }
}

/**
 * 즐겨찾기 탭 목록을 로컬 스토리지에 저장합니다.
 */
export function saveFavoriteTabs(tabs: string[], storageKey = STORAGE_KEY_PIANO_FAVORITES): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const validTabs = new Set(PIANO_AVAILABLE_MENU_CATALOG.map((m) => m.tab));
    const clean = tabs.filter((t) => validTabs.has(t)).slice(0, MAX_FAVORITE_DOCK_ITEMS);
    window.localStorage.setItem(storageKey, JSON.stringify(clean));
  } catch {
    // quota exceeded or disabled
  }
}

/**
 * 탭을 즐겨찾기에 추가하거나 제거(토글)합니다. (최대 6개 제한)
 */
export function toggleFavoriteTab(
  currentTabs: string[],
  tabToToggle: string,
  maxLimit = MAX_FAVORITE_DOCK_ITEMS
): { tabs: string[]; isAdded: boolean; isLimitReached: boolean } {
  const exists = currentTabs.includes(tabToToggle);
  if (exists) {
    return {
      tabs: currentTabs.filter((t) => t !== tabToToggle),
      isAdded: false,
      isLimitReached: false,
    };
  }

  if (currentTabs.length >= maxLimit) {
    return {
      tabs: currentTabs,
      isAdded: false,
      isLimitReached: true,
    };
  }

  return {
    tabs: [...currentTabs, tabToToggle],
    isAdded: true,
    isLimitReached: false,
  };
}
