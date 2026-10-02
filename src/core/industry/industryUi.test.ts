/**
 * Industry UI Label & Helper Parity Test
 * 실행: npx tsx src/core/industry/industryUi.test.ts
 */
import assert from 'node:assert/strict';
import { installIndustryPlugin, installIndustryPlugins } from './pluginHost';
import {
  getCustomerLabel,
  getOwnerLabel,
  getPlaceLabel,
  getPlaceNamePlaceholder,
  isAppointmentIndustry,
  isDaycareIndustry,
  isGymIndustry,
  isPilatesIndustry,
  isSkinClinicIndustry,
  getFeeLabel,
  getBankAccountPlaceholder,
  supportsDeposit,
  showsTextbooksLink,
  getRoomConfig,
} from './industryUi';
import type { IndustryPluginManifest } from './pluginTypes';

// 가상 플러그인 등록으로 industryUi의 매니페스트 lookup 및 fallback 완벽 검증
const mockPlugins: IndustryPluginManifest[] = [
  {
    id: 'piano',
    option: { value: 'piano', label: '피아노학원', description: 'desc' },
    theme: 'indigo',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: true,
    customerListTab: 'students',
    showSchoolFields: true,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '학원',
    ownerLabel: '원장',
    placeNamePlaceholder: '예: 행복 피아노 학원',
    customerLabel: '원생',
    isAppointment: false,
    feeLabel: '수강료',
    bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 선율음악학원)',
    supportsDeposit: false,
    showsTextbooksLink: true,
    roomConfig: {
      sectionTitle: '강의실 · 연습실',
      sectionDescription: '반 개설·보강 예약 시 선택할 공간입니다. 학원에서 쓰는 실 이름을 등록해 주세요.',
      defaultPrefix: '강의실',
      defaultKind: 'classroom',
      placeholder: '예: 피아노 1실',
      allowedKinds: ['classroom', 'practice'],
    },
  },
  {
    id: 'pilates',
    option: { value: 'pilates', label: '필라테스학원', description: 'desc' },
    theme: 'teal',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'members',
    showSchoolFields: true,
    showPickupFields: true,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '스튜디오',
    ownerLabel: '대표',
    placeNamePlaceholder: '예: 밸런스 필라테스',
    customerLabel: '회원',
    isAppointment: true,
  },
  {
    id: 'gym',
    option: { value: 'gym', label: '체육관', description: 'desc' },
    theme: 'orange',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: true,
    usesClassBasedSchedule: true,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: true,
    levelLabel: '수업 레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '체육관',
    ownerLabel: '대표',
    placeNamePlaceholder: '예: 강남 체육관',
    customerLabel: '회원',
    isAppointment: false,
  },
  {
    id: 'daycare',
    option: { value: 'daycare', label: '어린이집', description: 'desc' },
    theme: 'sky',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: true,
    usesClassBasedSchedule: true,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: true,
    levelLabel: '연령반',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '원',
    ownerLabel: '원장',
    placeNamePlaceholder: '예: 햇살 어린이집',
    customerLabel: '원아',
    isAppointment: false,
    feeLabel: '보육료',
  },
  {
    id: 'skin_clinic',
    option: { value: 'skin_clinic', label: '피부관리', description: 'desc' },
    theme: 'rose',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'members',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '관리 단계',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '샵',
    ownerLabel: '대표',
    placeNamePlaceholder: '예: 하루 피부관리',
    customerLabel: '고객',
    isAppointment: true,
    feeLabel: '이용료',
    bankAccountPlaceholder: '예: 국민은행 123456-04-123456 (예금주: 샵 이름)',
    supportsDeposit: true,
    showsTextbooksLink: false,
    roomConfig: {
      sectionTitle: '관리실',
      sectionDescription: '예약 시 배정할 관리실 이름을 등록해 주세요.',
      defaultPrefix: '관리실',
      defaultKind: 'treatment',
      placeholder: '예: 1번 관리실',
      allowedKinds: ['treatment'],
    },
  },
  {
    id: 'retail',
    option: { value: 'retail', label: '소매업', description: 'desc' },
    theme: 'teal',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'members',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '회원 등급',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '학원',
    ownerLabel: '대표',
    placeNamePlaceholder: '예: 행복 학원',
    customerLabel: '원생',
    isAppointment: false,
  },
  {
    id: 'sauna_jjimjilbang',
    option: { value: 'sauna_jjimjilbang', label: '사우나·찜질방', description: 'desc' },
    theme: 'orange',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'members',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '이용 등급',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '학원',
    ownerLabel: '대표',
    placeNamePlaceholder: '예: 행복 학원',
    customerLabel: '원생',
    isAppointment: false,
  },
];

installIndustryPlugins(mockPlugins);

function run(): void {
  // 1. Piano
  assert.equal(getPlaceLabel('piano'), '학원');
  assert.equal(getOwnerLabel('piano'), '원장');
  assert.equal(getPlaceNamePlaceholder('piano'), '예: 행복 피아노 학원');
  assert.equal(getCustomerLabel('piano'), '원생');
  assert.equal(isAppointmentIndustry('piano'), false);
  assert.equal(isPilatesIndustry('piano'), false);
  assert.equal(isSkinClinicIndustry('piano'), false);
  assert.equal(isGymIndustry('piano'), false);
  assert.equal(isDaycareIndustry('piano'), false);

  // 2. Pilates
  assert.equal(getPlaceLabel('pilates'), '스튜디오');
  assert.equal(getOwnerLabel('pilates'), '대표');
  assert.equal(getPlaceNamePlaceholder('pilates'), '예: 밸런스 필라테스');
  assert.equal(getCustomerLabel('pilates'), '회원');
  assert.equal(isAppointmentIndustry('pilates'), true);
  assert.equal(isPilatesIndustry('pilates'), true);
  assert.equal(isSkinClinicIndustry('pilates'), false);

  // 3. Gym
  assert.equal(getPlaceLabel('gym'), '체육관');
  assert.equal(getOwnerLabel('gym'), '대표');
  assert.equal(getPlaceNamePlaceholder('gym'), '예: 강남 체육관');
  assert.equal(getCustomerLabel('gym'), '회원');
  assert.equal(isAppointmentIndustry('gym'), false);
  assert.equal(isGymIndustry('gym'), true);
  // alias
  assert.equal(getPlaceLabel('taekwondo'), '체육관');
  assert.equal(getOwnerLabel('taekwondo'), '대표');
  assert.equal(getCustomerLabel('taekwondo'), '회원');

  // 4. Daycare
  assert.equal(getPlaceLabel('daycare'), '원');
  assert.equal(getOwnerLabel('daycare'), '원장');
  assert.equal(getPlaceNamePlaceholder('daycare'), '예: 햇살 어린이집');
  assert.equal(getCustomerLabel('daycare'), '원아');
  assert.equal(isAppointmentIndustry('daycare'), false);
  assert.equal(isDaycareIndustry('daycare'), true);
  // alias
  assert.equal(getPlaceLabel('preschool'), '원');
  assert.equal(getOwnerLabel('preschool'), '원장');
  assert.equal(getCustomerLabel('preschool'), '원아');

  // 5. Skin Clinic
  assert.equal(getPlaceLabel('skin_clinic'), '샵');
  assert.equal(getOwnerLabel('skin_clinic'), '대표');
  assert.equal(getPlaceNamePlaceholder('skin_clinic'), '예: 하루 피부관리');
  assert.equal(getCustomerLabel('skin_clinic'), '고객');
  assert.equal(isAppointmentIndustry('skin_clinic'), true);
  assert.equal(isSkinClinicIndustry('skin_clinic'), true);

  // 6. Retail
  assert.equal(getPlaceLabel('retail'), '학원');
  assert.equal(getOwnerLabel('retail'), '대표');
  assert.equal(getPlaceNamePlaceholder('retail'), '예: 행복 학원');
  assert.equal(getCustomerLabel('retail'), '원생');
  assert.equal(isAppointmentIndustry('retail'), false);

  // 7. Bath (sauna_jjimjilbang)
  assert.equal(getPlaceLabel('sauna_jjimjilbang'), '학원');
  assert.equal(getOwnerLabel('sauna_jjimjilbang'), '대표');
  assert.equal(getPlaceNamePlaceholder('sauna_jjimjilbang'), '예: 행복 학원');
  assert.equal(getCustomerLabel('sauna_jjimjilbang'), '원생');
  assert.equal(isAppointmentIndustry('sauna_jjimjilbang'), false);
  // alias
  assert.equal(getPlaceLabel('sauna_jjimjbang'), '학원');
  assert.equal(getOwnerLabel('sauna_jjimjbang'), '대표');
  assert.equal(getCustomerLabel('sauna_jjimjbang'), '원생');

  // 8. Generic (Academy)
  assert.equal(getPlaceLabel('academy'), '학원');
  assert.equal(getOwnerLabel('academy'), '원장');
  assert.equal(getPlaceNamePlaceholder('academy'), '예: 행복 학원');
  assert.equal(getCustomerLabel('academy'), '원생');
  assert.equal(isAppointmentIndustry('academy'), false);

  // 9. Null / Undefined / Empty
  assert.equal(getPlaceLabel(null), '학원');
  assert.equal(getOwnerLabel(null), '대표');
  assert.equal(getPlaceNamePlaceholder(null), '예: 행복 학원');
  assert.equal(getCustomerLabel(null), '원생');
  assert.equal(isAppointmentIndustry(null), false);
  assert.equal(isPilatesIndustry(null), false);
  assert.equal(isSkinClinicIndustry(null), false);
  assert.equal(isGymIndustry(null), false);
  assert.equal(isDaycareIndustry(null), false);

  assert.equal(getPlaceLabel(undefined), '학원');
  assert.equal(getOwnerLabel(undefined), '대표');
  assert.equal(getPlaceNamePlaceholder(undefined), '예: 행복 학원');
  assert.equal(getCustomerLabel(undefined), '원생');
  assert.equal(isAppointmentIndustry(undefined), false);

  assert.equal(getPlaceLabel(''), '학원');
  assert.equal(getOwnerLabel(''), '대표');
  assert.equal(getPlaceNamePlaceholder(''), '예: 행복 학원');
  assert.equal(getCustomerLabel(''), '원생');
  assert.equal(isAppointmentIndustry(''), false);

  // 10. getFeeLabel
  assert.equal(getFeeLabel('piano'), '수강료');
  assert.equal(getFeeLabel('daycare'), '보육료');
  assert.equal(getFeeLabel('skin_clinic'), '이용료');
  assert.equal(getFeeLabel(null), '수강료');
  assert.equal(getFeeLabel(undefined), '수강료');

  // 11. getBankAccountPlaceholder
  assert.equal(getBankAccountPlaceholder('skin_clinic'), '예: 국민은행 123456-04-123456 (예금주: 샵 이름)');
  assert.equal(getBankAccountPlaceholder('piano'), '예: 국민은행 123456-04-123456 (예금주: 선율음악학원)');

  // 12. supportsDeposit
  assert.equal(supportsDeposit('skin_clinic'), true);
  assert.equal(supportsDeposit('piano'), false);
  assert.equal(supportsDeposit(null), false);

  // 13. showsTextbooksLink
  assert.equal(showsTextbooksLink('piano'), true);
  assert.equal(showsTextbooksLink('skin_clinic'), false);
  assert.equal(showsTextbooksLink(null), false);

  // 14. getRoomConfig
  const pianoRooms = getRoomConfig('piano');
  assert.equal(pianoRooms.sectionTitle, '강의실 · 연습실');
  assert.equal(pianoRooms.defaultKind, 'classroom');
  const skinRooms = getRoomConfig('skin_clinic');
  assert.equal(skinRooms.sectionTitle, '관리실');
  assert.equal(skinRooms.defaultKind, 'treatment');
  assert.deepEqual([...skinRooms.allowedKinds], ['treatment']);

  console.log('industryUi.test.ts OK (all industry UI label parity verified)');
}

run();
