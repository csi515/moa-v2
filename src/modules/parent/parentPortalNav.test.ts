/**
 * 보호자 하단 네비. 실행: npx tsx src/modules/parent/parentPortalNav.test.ts
 *
 * 피아노·어린이집·체육관·피부·필라테스 탭 id·라벨은 고정.
 * 그 외는 place/customer/fee·예약 여부·교재 플래그로만 문구를 만든다.
 */
import assert from 'node:assert/strict';
import { installIndustryPlugin, installIndustryPlugins } from '@/core/industry/pluginHost';
import {
  getCustomerLabel,
  getFeeLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  showsTextbooksLink,
} from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { bathPluginManifest } from '@/industries/bath/plugin';
import { retailPluginManifest } from '@/industries/retail/plugin';
import { getParentPortalNav, getParentPortalSecondaryTabs } from './parentPortalNav';

const PIANO_ONLY = ['과제', '진도', '교재'] as const;

installIndustryPlugins([retailPluginManifest, bathPluginManifest]);

function manifest(
  id: IndustryType,
  labels: {
    placeLabel: string;
    customerLabel: string;
    feeLabel: string;
    isAppointment?: boolean;
    showsTextbooksLink?: boolean;
  },
): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'parent nav fixture' },
    theme: 'indigo',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: labels.placeLabel,
    customerLabel: labels.customerLabel,
    feeLabel: labels.feeLabel,
    isAppointment: labels.isAppointment === true,
    showsTextbooksLink: labels.showsTextbooksLink === true,
  };
}

installIndustryPlugin(manifest('cafe', {
  placeLabel: '매장',
  customerLabel: '손님',
  feeLabel: '결제',
  isAppointment: true,
  showsTextbooksLink: true,
}));
installIndustryPlugin(manifest('art_academy', {
  placeLabel: '학원',
  customerLabel: '원생',
  feeLabel: '학원비',
}));

function pairs(industry: string): Array<[string, string]> {
  return getParentPortalNav(industry).map((item) => [item.id, item.label]);
}

function labelsOf(industry: string): string[] {
  return getParentPortalNav(industry).map((item) => item.label);
}

function assertNoPianoLearning(industry: string): void {
  const nav = getParentPortalNav(industry);
  const blob = nav.map((item) => `${item.id}:${item.label}`).join('\n');
  for (const word of PIANO_ONLY) {
    assert.equal(blob.includes(word), false, `${industry} showed piano-only 「${word}」: ${blob}`);
  }
  assert.equal(nav.some((item) => item.id === 'assignments' || item.id === 'progress'), false, industry);
  assert.deepEqual(
    getParentPortalSecondaryTabs(industry).filter((id) => id === 'assignments' || id === 'progress'),
    [],
    industry,
  );
}

function assertNoAcademyUnlessManifest(industry: string): void {
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const fee = getFeeLabel(industry);
  const blob = labelsOf(industry).join('\n');
  const manifest = `${place}\n${customer}\n${fee}`;
  if (!manifest.includes('학원')) {
    assert.equal(blob.includes('학원'), false, `${industry} said 학원 but manifest is ${manifest}`);
  }
  if (!manifest.includes('원생')) {
    assert.equal(blob.includes('원생'), false, `${industry} said 원생 but manifest is ${manifest}`);
  }
}

assert.deepEqual(pairs('piano'), [
  ['home', '홈'],
  ['schedule', '일정'],
  ['attendance', '출결'],
  ['tuition', '수납'],
  ['more', '더보기'],
]);
assert.deepEqual(pairs(null as unknown as string), pairs('piano'));
assert.deepEqual(pairs(''), pairs('piano'));

assert.deepEqual(pairs('daycare'), [
  ['home', '홈'],
  ['journals', '알림장'],
  ['medications', '투약'],
  ['attendance', '등하원'],
  ['tuition', '보육료'],
  ['more', '더보기'],
]);

assert.deepEqual(pairs('gym'), [
  ['home', '홈'],
  ['schedule', '수업'],
  ['shuttle', '차량'],
  ['attendance', '출결'],
  ['tuition', '수강료'],
  ['more', '더보기'],
]);
assert.deepEqual(pairs('taekwondo'), pairs('gym'));

assert.deepEqual(pairs('skin_clinic'), [
  ['home', '홈'],
  ['bookings', '예약'],
  ['tuition', '이용료'],
  ['attendance', '출입'],
  ['more', '더보기'],
]);

assert.deepEqual(pairs('pilates'), [
  ['home', '홈'],
  ['bookings', '예약'],
  ['tuition', '수강료'],
  ['attendance', '출입'],
  ['more', '더보기'],
]);

for (const industry of ['retail', 'sauna_jjimjilbang', 'sauna_jjimjbang', 'academy', 'english_academy', 'cafe', 'art_academy'] as const) {
  const nav = getParentPortalNav(industry);
  assert.deepEqual(nav.map((item) => item.id), ['home', 'attendance', 'tuition', 'more'], industry);
  assert.equal(nav[0].label, '홈', industry);
  assert.equal(nav[3].label, '더보기', industry);
  assert.equal(
    nav[1].label,
    isAppointmentIndustry(industry) ? '출입' : '출결',
    industry,
  );
  assert.equal(nav[2].label, getFeeLabel(industry), industry);
  assert.notEqual(nav[2].label, '수납', industry);
  assertNoPianoLearning(industry);
  assertNoAcademyUnlessManifest(industry);
  for (const item of nav) assert.ok(item.icon, industry);
}

assert.equal(getPlaceLabel('retail'), '매장');
assert.equal(getCustomerLabel('retail'), '고객');
assert.equal(getFeeLabel('retail'), '이용료');
assert.deepEqual(labelsOf('retail'), ['홈', '출결', '이용료', '더보기']);

assert.equal(getPlaceLabel('sauna_jjimjilbang'), '사업장');
assert.equal(getCustomerLabel('sauna_jjimjilbang'), '고객');
assert.equal(getFeeLabel('sauna_jjimjilbang'), '이용료');
assert.deepEqual(labelsOf('sauna_jjimjilbang'), ['홈', '출결', '이용료', '더보기']);
assert.deepEqual(labelsOf('sauna_jjimjbang'), labelsOf('sauna_jjimjilbang'));

assert.equal(showsTextbooksLink('retail'), false);
assert.equal(showsTextbooksLink('cafe'), true);
assert.equal(isAppointmentIndustry('cafe'), true);
assert.deepEqual(labelsOf('cafe'), ['홈', '출입', '결제', '더보기']);
assert.equal(labelsOf('cafe').join('').includes('학원'), false);
assert.equal(labelsOf('cafe').join('').includes('원생'), false);

assert.equal(getPlaceLabel('art_academy'), '학원');
assert.equal(getCustomerLabel('art_academy'), '원생');
assert.deepEqual(labelsOf('art_academy'), ['홈', '출결', '학원비', '더보기']);

assert.equal(getFeeLabel('academy'), '이용료');
assert.equal(getPlaceLabel('academy'), '사업장');
assert.equal(getCustomerLabel('academy'), '고객');
assert.deepEqual(labelsOf('academy'), ['홈', '출결', '이용료', '더보기']);
assert.deepEqual(labelsOf('english_academy'), labelsOf('academy'));
assert.equal(labelsOf('english_academy').join('').includes('학원'), false);
assert.equal(labelsOf('english_academy').join('').includes('원생'), false);

console.log('parentPortalNav.test.ts OK');
