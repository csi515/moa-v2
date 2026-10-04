import type { ParentPortalTab } from '@/types/education';
import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import {
  getCustomerLabel,
  getPlaceLabel,
  isSkinClinicIndustry,
  showsTextbooksLink,
} from '@/core/industry/industryUi';
import { getParentPortalSecondaryTabs } from '../parentPortalNav';

export type ParentMoreMenuItemCopy = {
  id: ParentPortalTab;
  label: string;
  description: string;
};

export type ParentMoreSwitchCopy = {
  title: string;
  description: string;
};

/**
 * 피아노 학습 메뉴(과제·진도·스탬프·리포트)는 업종 id가 아니라
 * showsTextbooksLink로만 연다. 이 플래그는 현재 피아노 매니페스트만 true다.
 */
export function usesPianoParentMoreMenu(
  industry: IndustryType | string | null | undefined
): boolean {
  return showsTextbooksLink(normalizeIndustryType(industry));
}

function pianoMoreItems(): ParentMoreMenuItemCopy[] {
  return [
    { id: 'notices', label: '안내', description: '학원 공지·알림' },
    { id: 'assignments', label: '과제', description: '이번 주 과제·확인' },
    { id: 'progress', label: '진도·연습', description: '커리큘럼·연습 기록·완곡 신청' },
    { id: 'stamps', label: '완곡 스탬프', description: '자녀 스탬프판·완곡 리포트' },
    { id: 'reports', label: '학습 리포트', description: '월간 학습 리포트' },
    { id: 'events', label: '행사', description: '연주회·학원 행사' },
  ];
}

/** 더보기에 실제로 그리는 보조 메뉴. 탭 id·포함 조건은 기존과 같다. */
export function getParentMoreMenuItemCopy(
  industry: IndustryType | string | null | undefined
): ParentMoreMenuItemCopy[] {
  const resolved = normalizeIndustryType(industry);
  if (usesPianoParentMoreMenu(resolved)) return pianoMoreItems();

  const place = getPlaceLabel(resolved);
  const secondary = getParentPortalSecondaryTabs(resolved);
  const items: ParentMoreMenuItemCopy[] = [
    { id: 'notices', label: '안내', description: `${place} 공지·알림` },
  ];
  if (secondary.includes('events')) {
    items.push({ id: 'events', label: '행사', description: `${place} 행사` });
  }
  if (secondary.includes('pickups')) {
    items.push({
      id: 'pickups',
      label: '귀가 명단',
      description: '데려갈 수 있는 사람과 알레르기',
    });
  }
  if (secondary.includes('incidents')) {
    items.push({
      id: 'incidents',
      label: '사고 안내',
      description: `${place}에서 전한 사고 기록`,
    });
  }
  return items;
}

/**
 * 자녀·장소 전환 버튼.
 * 피부관리 문구는 그대로 두고, 그 외는 customerLabel·placeLabel만 쓴다.
 */
export function getParentMoreSwitchCopy(
  industry: IndustryType | string | null | undefined
): ParentMoreSwitchCopy {
  const resolved = normalizeIndustryType(industry);
  if (isSkinClinicIndustry(resolved)) {
    return { title: '고객·샵 전환', description: '다른 샵 선택' };
  }
  const place = getPlaceLabel(resolved);
  const customer = getCustomerLabel(resolved);
  return {
    title: `${customer}·${place} 전환`,
    description: `다른 ${customer} 또는 ${place} 선택`,
  };
}

export function getParentMoreUnlinkHint(
  industry: IndustryType | string | null | undefined
): string {
  const place = getPlaceLabel(normalizeIndustryType(industry));
  return `앱 연결만 해제 · ${place} 등록은 유지`;
}

export function getParentMoreUnlinkMessage(
  industry: IndustryType | string | null | undefined,
  organizationName: string
): string {
  const resolved = normalizeIndustryType(industry);
  const place = getPlaceLabel(resolved);
  const customer = getCustomerLabel(resolved);
  return `${organizationName} 앱 연결만 해제할까요? ${place} ${customer} 등록은 유지되며, 등록 해지는 ${place}에서만 처리합니다. 출결·수납 기록은 삭제되지 않고 조회만 가능합니다. 다시 연결하려면 ${place} 연결 코드가 필요합니다.`;
}
