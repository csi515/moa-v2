import type { NavTab } from '@/shared/navigation/navigationTypes';

/**
 * @deprecated Phase 4 — 폐기 예정 (docs/MOA_AGNOSTIC_ERP_PHASE4_SPEC.md).
 * 신규 권한은 organization_roles JSONB + authorization_grants + permission_catalog 를 사용한다.
 * 본 모듈은 레거시 네비 탭 노출 호환용으로만 유지한다. 목표 제거: 2026-Q3.
 */
/** 원장이 강사마다 켜는 허용. 없으면 모두 꺼진 것으로 봅니다. */
export interface StaffGrants {
  guardianPhone?: boolean;
  editStudent?: boolean;
  withdrawStudent?: boolean;
  tuition?: boolean;
  notices?: boolean;
  recitals?: boolean;
  consultationAvailability?: boolean;
  practiceRooms?: boolean;
  passes?: boolean;
  joinApproval?: boolean;
}

export const EMPTY_STAFF_GRANTS: StaffGrants = {
  guardianPhone: false,
  editStudent: false,
  withdrawStudent: false,
  tuition: false,
  notices: false,
  recitals: false,
  consultationAvailability: false,
  practiceRooms: false,
  passes: false,
  joinApproval: false,
};

/** UI 체크박스 목록은 폐기됨. tuition 등 재무 관련 키는 항상 false로 취급한다. */
export const STAFF_GRANT_FIELDS: { key: keyof StaffGrants; label: string }[] = [
  { key: 'guardianPhone', label: '보호자 전화' },
  { key: 'editStudent', label: '원생 정보 수정' },
  { key: 'withdrawStudent', label: '퇴원' },
  { key: 'notices', label: '안내장' },
  { key: 'recitals', label: '연주회 등록·삭제' },
  { key: 'consultationAvailability', label: '상담 가능시간' },
  { key: 'practiceRooms', label: '연습실 승인' },
  { key: 'passes', label: '회차권' },
  { key: 'joinApproval', label: '수강 가입 승인' },
];

export function normalizeStaffGrants(raw?: StaffGrants | null): StaffGrants {
  return { ...EMPTY_STAFF_GRANTS, ...(raw ?? {}) };
}

export function applyStaffGrantTabs(tabs: NavTab[], grants: StaffGrants | null, isStaff: boolean): NavTab[] {
  if (!isStaff || !grants) return tabs;
  const next = [...tabs];
  if (grants.practiceRooms && !next.includes('practice-rooms')) next.push('practice-rooms');
  if (grants.passes && !next.includes('passes')) next.push('passes');
  return next;
}
