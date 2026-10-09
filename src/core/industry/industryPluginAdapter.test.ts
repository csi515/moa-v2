/**
 * IndustryPluginAdapter & DefaultFallbackPluginAdapter Contract & Safety Test
 * 실행: npx tsx src/core/industry/industryPluginAdapter.test.ts
 */
import assert from 'node:assert/strict';
import {
  getIndustryPluginAdapter,
  IndustryAdapter,
  DefaultFallbackPluginAdapter,
  StandardIndustryPluginAdapter,
} from './IndustryAdapter';
import { installIndustryPlugins } from './pluginHost';
import type { IndustryPluginManifest } from './pluginTypes';

// Core 단위 테스트를 위한 표준 테스트 플러그인 매니페스트 등록
const testPlugins: IndustryPluginManifest[] = [
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
    customerLabel: '원생',
    isAppointment: false,
    feeLabel: '수강료',
    supportsDeposit: false,
    showsTextbooksLink: true,
    showsMakeupList: true,
    showsPracticeRoomTab: true,
    runsPinCheckInSideEffects: true,
    showsCustomerPoints: false,
  },
  {
    id: 'daycare',
    option: { value: 'daycare', label: '어린이집', description: 'desc' },
    theme: 'amber',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: true,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: true,
    levelLabel: '반',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '어린이집',
    ownerLabel: '원장',
    customerLabel: '원아',
    isAppointment: false,
    feeLabel: '보육료',
    supportsDeposit: false,
    showsTextbooksLink: false,
    showsMakeupList: false,
    showsPracticeRoomTab: false,
    runsPinCheckInSideEffects: true,
    showsCustomerPoints: false,
  },
  {
    id: 'retail',
    option: { value: 'retail', label: '소매', description: 'desc' },
    theme: 'emerald',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '등급',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '매장',
    ownerLabel: '대표',
    customerLabel: '고객',
    isAppointment: false,
    feeLabel: '결제금액',
    supportsDeposit: false,
    showsTextbooksLink: false,
    showsCustomerPoints: true,
    showsPracticeRoomTab: false,
  },
  {
    id: 'skin_clinic',
    option: { value: 'skin_clinic', label: '피부관리', description: 'desc' },
    theme: 'rose',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '회원등급',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '에스테틱',
    ownerLabel: '원장',
    customerLabel: '고객',
    isAppointment: true,
    feeLabel: '시술비',
    supportsDeposit: true,
    showsTextbooksLink: false,
    bookingAdapter: {
      flow: 'treatment',
      categoryLabels: { private: '1:1', group: '일반', reformer: '특수', other: '기타' },
      serviceDescription: '피부 관리',
      serviceNamePlaceholder: '관리명',
      notifyOnStatus: ['confirmed'],
      sessionNoun: '시술',
      consumePassOnNoShow: true,
      calendarAccentBtn: '',
      calendarAccentTab: '',
      calendarAccentText: '',
      statusConfirmBtnClass: '',
      serviceHeaderBtn: '',
      serviceSubmitBtn: '',
      serviceIconClass: '',
    },
  },
  {
    id: 'pilates',
    option: { value: 'pilates', label: '필라테스', description: 'desc' },
    theme: 'teal',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '회원등급',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: '스튜디오',
    ownerLabel: '원장',
    customerLabel: '회원',
    isAppointment: true,
    feeLabel: '수강료',
    supportsDeposit: false,
    showsTextbooksLink: false,
    bookingAdapter: {
      flow: 'ticket',
      categoryLabels: { private: '개인', group: '그룹', reformer: '리포머', other: '기타' },
      serviceDescription: '수업 예약',
      serviceNamePlaceholder: '수업명',
      notifyOnStatus: ['confirmed'],
      sessionNoun: '수업',
      consumePassOnNoShow: true,
      calendarAccentBtn: '',
      calendarAccentTab: '',
      calendarAccentText: '',
      statusConfirmBtnClass: '',
      serviceHeaderBtn: '',
      serviceSubmitBtn: '',
      serviceIconClass: '',
    },
  },
];

installIndustryPlugins(testPlugins);

// ========================================================
// 1. Fallback Safety: null / undefined / 미지원 업종 안전성
// ========================================================
const unknownAdapter = getIndustryPluginAdapter('unsupported_future_studio');
assert.ok(unknownAdapter, 'Unknown industry must return a non-null adapter');
assert.ok(
  unknownAdapter instanceof DefaultFallbackPluginAdapter ||
    unknownAdapter instanceof StandardIndustryPluginAdapter,
  'Unknown industry must resolve to fallback adapter'
);

// 라벨 조회 시 크래시 없이 안전한 기본값 반환
assert.equal(typeof unknownAdapter.getLabel('place'), 'string');
assert.equal(typeof unknownAdapter.getLabel('customer'), 'string');
assert.equal(typeof unknownAdapter.getLabel('owner'), 'string');
assert.equal(typeof unknownAdapter.getLabel('fee'), 'string');
assert.equal(typeof unknownAdapter.getLabel('level'), 'string');

// 기능 조회 시 크래시 없이 false 반환
assert.equal(unknownAdapter.hasFeature('makeup_list'), false);
assert.equal(unknownAdapter.hasFeature('practice_room_tab'), false);
assert.equal(unknownAdapter.hasFeature('deposit'), false);
assert.equal(unknownAdapter.hasFeature('pin_side_effects'), false);
assert.equal(unknownAdapter.hasFeature('customer_points'), false);

// 서브 설정 안전성
assert.ok(unknownAdapter.rosterConfig, 'rosterConfig must be non-null');
assert.equal(typeof unknownAdapter.rosterConfig.withdrawnLabel, 'string');
assert.ok(unknownAdapter.roomConfig, 'roomConfig must be non-null');
assert.equal(typeof unknownAdapter.roomConfig.sectionTitle, 'string');

// null 및 undefined 안전성
const nullAdapter = getIndustryPluginAdapter(null);
assert.ok(nullAdapter, 'Null industry must return a valid adapter');
assert.equal(typeof nullAdapter.getLabel('customer'), 'string');

const undefinedAdapter = getIndustryPluginAdapter(undefined);
assert.ok(undefinedAdapter, 'Undefined industry must return a valid adapter');
assert.equal(typeof undefinedAdapter.getLabel('customer'), 'string');

// ========================================================
// 2. 표준 설치 플러그인 기능 및 라벨 정규화 검증
// ========================================================
// 1) Piano
const pianoAdapter = getIndustryPluginAdapter('piano');
assert.equal(pianoAdapter.getLabel('customer'), '원생');
assert.equal(pianoAdapter.getLabel('place'), '학원');
assert.equal(pianoAdapter.getLabel('fee'), '수강료');
assert.equal(pianoAdapter.hasFeature('makeup_list'), true);
assert.equal(pianoAdapter.hasFeature('practice_room_tab'), true);
assert.equal(pianoAdapter.hasFeature('textbooks_link'), true);
assert.equal(pianoAdapter.hasFeature('pin_side_effects'), true);
assert.equal(pianoAdapter.hasFeature('customer_points'), false);

// 2) Daycare
const daycareAdapter = getIndustryPluginAdapter('daycare');
assert.equal(daycareAdapter.getLabel('customer'), '원아');
assert.equal(daycareAdapter.getLabel('place'), '어린이집');
assert.equal(daycareAdapter.getLabel('fee'), '보육료');
assert.equal(daycareAdapter.hasFeature('pickup_fields'), true);
assert.equal(daycareAdapter.hasFeature('makeup_list'), false);
assert.equal(daycareAdapter.hasFeature('practice_room_tab'), false);

// 3) Retail
const retailAdapter = getIndustryPluginAdapter('retail');
assert.equal(retailAdapter.hasFeature('customer_points'), true);
assert.equal(retailAdapter.hasFeature('practice_room_tab'), false);

// 4) Skin Clinic
const skinAdapter = getIndustryPluginAdapter('skin_clinic');
assert.equal(skinAdapter.hasFeature('deposit'), true);
assert.equal(skinAdapter.bookingAdapter?.flow, 'treatment');

// 5) Pilates
const pilatesAdapter = getIndustryPluginAdapter('pilates');
assert.equal(pilatesAdapter.bookingAdapter?.flow, 'ticket');

// ========================================================
// 3. IndustryAdapter 정적 파사드 메서드 검증
// ========================================================
assert.equal(IndustryAdapter.hasFeature('makeup_list', 'piano'), true);
assert.equal(IndustryAdapter.hasFeature('makeup_list', 'daycare'), false);
assert.equal(IndustryAdapter.resolveLabel('customer', 'daycare'), '원아');
assert.equal(IndustryAdapter.resolveLabel('fee', 'daycare'), '보육료');
assert.equal(IndustryAdapter.resolveLabel('customer', 'retail'), '고객');

console.log('industryPluginAdapter.test.ts OK (standard adapter & fallback verified)');
