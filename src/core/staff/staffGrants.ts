import type { NavTab } from '@/shared/navigation/navigationTypes';

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

export const STAFF_GRANT_FIELDS: { key: keyof StaffGrants; label: string }[] = [
  { key: 'guardianPhone', label: '보호자 전화' },
  { key: 'editStudent', label: '원생 정보 수정' },
  { key: 'withdrawStudent', label: '퇴원' },
  { key: 'tuition', label: '수납' },
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
