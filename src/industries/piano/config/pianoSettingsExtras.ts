/**
 * 피아노 설정「부가」메뉴 — 기본 + 활성 optional capability.
 */
import type { NavTab } from '@/context/AppContext';

export const PIANO_CORE_SETTINGS_EXTRAS: { tab: NavTab; label: string }[] = [
  { tab: 'bookings', label: '상담 가능시간' },
  { tab: 'classes', label: '반 관리' },
  { tab: 'check-in', label: 'PIN 출석' },
  { tab: 'assignments', label: '주간 과제' },
  { tab: 'practice', label: '연습 기록' },
  /** 사용자 진입 SSOT — Refine /seat-rooms 가 아닌 연습실 UX */
  { tab: 'practice-rooms', label: '연습실 예약' },
  { tab: 'textbooks', label: '교재 관리' },
  { tab: 'passes', label: '회차권 관리' },
  { tab: 'resources', label: '자료 카탈로그' },
  { tab: 'recitals', label: '연주회·콩쿠르' },
  { tab: 'curriculum', label: '커리큘럼·진도' },
  { tab: 'achievements', label: '시험·등급' },
  { tab: 'song-stamps', label: '완곡 스탬프' },
  { tab: 'reports', label: '학습 리포트' },
];

/** optional capability → 설정 부가 탭 (활성 cap만 노출) */
const OPTIONAL_SETTINGS_BY_CAP: { cap: string; tab: NavTab; label: string }[] = [
  { cap: 'retention_marketing', tab: 'retention', label: '리텐션·만료 알림' },
  { cap: 'vehicle_shuttle', tab: 'shuttle', label: '통학·셔틀' },
  { cap: 'membership_referral_tree', tab: 'family-tree', label: '추천·패밀리' },
  /** 교재와 분리 — 소모품/자재 재고 addon */
  { cap: 'inventory', tab: 'supplies', label: '소모품 재고' },
];

export function getPianoSettingsExtras(enabledCaps: readonly string[]): {
  tab: NavTab;
  label: string;
}[] {
  const capSet = new Set(enabledCaps);
  const optional = OPTIONAL_SETTINGS_BY_CAP.filter((row) => capSet.has(row.cap)).map(
    ({ tab, label }) => ({ tab, label })
  );
  return [...PIANO_CORE_SETTINGS_EXTRAS, ...optional];
}

/** @deprecated 정적 목록 — getPianoSettingsExtras 사용 */
export const PIANO_SETTINGS_EXTRAS = PIANO_CORE_SETTINGS_EXTRAS;
