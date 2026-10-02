import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { withNoticesTabs } from '@/core/industry/pluginTypes';

/** 사우나·찜질방(Bath) 플러그인 매니페스트 — 골격만. 업무 로직 없음 */
export const bathPluginManifest: IndustryPluginManifest = {
  id: 'sauna_jjimjilbang',
  option: {
    value: 'sauna_jjimjilbang',
    label: '사우나·찜질방',
    description: '사우나·찜질',
  },
  aliases: ['sauna_jjimjbang'],
  theme: 'orange',
  accent: {
    btn: 'bg-orange-600',
    btnHover: 'hover:bg-orange-700',
    icon: 'text-orange-600',
    hoverBg: 'hover:bg-orange-50',
    ring: 'focus:ring-orange-500 focus:border-orange-300',
  },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'members',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '이용 등급',
  placeLabel: '학원',
  ownerLabel: '대표',
  placeNamePlaceholder: '예: 행복 학원',
  customerLabel: '원생',
  isAppointment: false,
  feeLabel: '수강료',
  bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 선율음악학원)',
  supportsDeposit: false,
  showsTextbooksLink: false,
  roomConfig: {
    sectionTitle: '강의실 · 연습실',
    sectionDescription: '반 개설·보강 예약 시 선택할 공간입니다. 학원에서 쓰는 실 이름을 등록해 주세요.',
    defaultPrefix: '강의실',
    defaultKind: 'classroom',
    placeholder: '예: 피아노 1실',
    allowedKinds: ['classroom', 'practice'],
  },
  adminTabs: withNoticesTabs(['dashboard', 'members', 'bookings', 'settings']),
  staffTabs: withNoticesTabs(['dashboard', 'members', 'bookings']),
};
