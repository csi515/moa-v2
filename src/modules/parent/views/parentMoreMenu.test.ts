/**
 * 보호자 더보기 메뉴 문구.
 * 실행: npx tsx src/modules/parent/views/parentMoreMenu.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { getCustomerLabel, getPlaceLabel, showsTextbooksLink } from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import {
  getParentMoreMenuItemCopy,
  getParentMoreSwitchCopy,
  getParentMoreUnlinkHint,
  getParentMoreUnlinkMessage,
  usesPianoParentMoreMenu,
} from './parentMoreMenu';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readPlugin(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

const pluginSources: Record<string, string> = {
  piano: readPlugin('industries/piano/plugin.ts'),
  daycare: readPlugin('industries/daycare/plugin.ts'),
  skin: readPlugin('industries/skin/plugin.ts'),
  pilates: readPlugin('industries/pilates/plugin.ts'),
  gym: readPlugin('industries/gym/plugin.ts'),
  retail: readPlugin('industries/retail/plugin.ts'),
  bath: readPlugin('industries/bath/plugin.ts'),
};

assert.match(pluginSources.piano, /showsTextbooksLink:\s*true/);
for (const key of ['daycare', 'skin', 'pilates', 'gym', 'retail', 'bath']) {
  assert.match(pluginSources[key], /showsTextbooksLink:\s*false/);
}
assert.match(pluginSources.piano, /placeLabel:\s*'학원'/);
assert.match(pluginSources.piano, /customerLabel:\s*'원생'/);
assert.match(pluginSources.daycare, /placeLabel:\s*'원'/);
assert.match(pluginSources.daycare, /customerLabel:\s*'원아'/);
assert.match(pluginSources.skin, /placeLabel:\s*'샵'/);
assert.match(pluginSources.skin, /customerLabel:\s*'고객'/);
assert.match(pluginSources.pilates, /placeLabel:\s*'스튜디오'/);
assert.match(pluginSources.pilates, /customerLabel:\s*'회원'/);
assert.match(pluginSources.gym, /placeLabel:\s*'체육관'/);
assert.match(pluginSources.gym, /customerLabel:\s*'회원'/);
assert.match(pluginSources.retail, /placeLabel:\s*'학원'/);
assert.match(pluginSources.retail, /customerLabel:\s*'원생'/);
assert.match(pluginSources.bath, /placeLabel:\s*'학원'/);
assert.match(pluginSources.bath, /customerLabel:\s*'원생'/);

function manifest(
  id: IndustryType,
  placeLabel: string,
  customerLabel: string,
  extra: Partial<IndustryPluginManifest> = {}
): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: id },
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
    placeLabel,
    customerLabel,
    isAppointment: false,
    showsTextbooksLink: false,
    ...extra,
  };
}

installIndustryPlugins([
  manifest('piano', '학원', '원생', { showsTextbooksLink: true }),
  manifest('daycare', '원', '원아'),
  manifest('skin_clinic', '샵', '고객', { isAppointment: true }),
  manifest('pilates', '스튜디오', '회원', { isAppointment: true }),
  manifest('gym', '체육관', '회원'),
  manifest('retail', '학원', '원생'),
  manifest('sauna_jjimjilbang', '학원', '원생', { aliases: ['sauna_jjimjbang'] }),
]);

const PIANO_ONLY = ['assignments', 'progress', 'stamps', 'reports'] as const;

function texts(industry: string): string[] {
  const items = getParentMoreMenuItemCopy(industry);
  const switchCopy = getParentMoreSwitchCopy(industry);
  return [
    ...items.flatMap((item) => [item.label, item.description]),
    switchCopy.title,
    switchCopy.description,
    getParentMoreUnlinkHint(industry),
    getParentMoreUnlinkMessage(industry, '테스트기관'),
  ];
}

function assertNoForeignWords(industry: string) {
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const joined = texts(industry).join('\n');
  if (!place.includes('학부모') && !customer.includes('학부모')) {
    assert.equal(joined.includes('학부모'), false, `${industry} leaked 학부모`);
  }
  if (!place.includes('학원') && !customer.includes('학원')) {
    assert.equal(joined.includes('학원'), false, `${industry} leaked 학원`);
  }
  if (!place.includes('샵') && !customer.includes('샵')) {
    assert.equal(joined.includes('샵'), false, `${industry} leaked 샵`);
  }
}

function ids(industry: string): string[] {
  return getParentMoreMenuItemCopy(industry).map((item) => item.id);
}

assert.equal(showsTextbooksLink('piano'), true);
assert.equal(showsTextbooksLink('daycare'), false);
assert.equal(showsTextbooksLink('skin_clinic'), false);
assert.equal(showsTextbooksLink('pilates'), false);
assert.equal(showsTextbooksLink('gym'), false);
assert.equal(showsTextbooksLink('retail'), false);
assert.equal(showsTextbooksLink('sauna_jjimjilbang'), false);
assert.equal(usesPianoParentMoreMenu('piano'), true);
assert.equal(usesPianoParentMoreMenu(''), true);
assert.equal(usesPianoParentMoreMenu('daycare'), false);

assert.deepEqual(ids('piano'), ['notices', 'assignments', 'progress', 'stamps', 'reports', 'events']);
const piano = getParentMoreMenuItemCopy('piano');
assert.equal(piano[0].description, '학원 공지·알림');
assert.equal(piano[5].description, '연주회·학원 행사');
assert.deepEqual(getParentMoreSwitchCopy('piano'), {
  title: '원생·학원 전환',
  description: '다른 원생 또는 학원 선택',
});
assert.equal(getParentMoreUnlinkHint('piano'), '앱 연결만 해제 · 학원 등록은 유지');
assert.match(getParentMoreUnlinkMessage('piano', '선율'), /학원 원생 등록은 유지/);
assert.doesNotMatch(getParentMoreUnlinkMessage('piano', '선율'), /학부모|퇴원/);

assert.deepEqual(ids('daycare'), ['notices', 'pickups', 'incidents']);
assert.equal(getParentMoreMenuItemCopy('daycare').find((i) => i.id === 'incidents')?.description, '원에서 전한 사고 기록');
assert.deepEqual(getParentMoreSwitchCopy('daycare'), {
  title: '원아·원 전환',
  description: '다른 원아 또는 원 선택',
});
assertNoForeignWords('daycare');

assert.deepEqual(ids('skin_clinic'), ['notices']);
assert.equal(getParentMoreMenuItemCopy('skin_clinic')[0].description, '샵 공지·알림');
assert.deepEqual(getParentMoreSwitchCopy('skin_clinic'), {
  title: '고객·샵 전환',
  description: '다른 샵 선택',
});
assert.equal(getParentMoreUnlinkHint('skin_clinic'), '앱 연결만 해제 · 샵 등록은 유지');
assert.match(getParentMoreUnlinkMessage('skin_clinic', '하루'), /샵 고객 등록은 유지/);
assertNoForeignWords('skin_clinic');
for (const id of PIANO_ONLY) assert.equal(ids('skin_clinic').includes(id), false);

assert.deepEqual(ids('pilates'), ['notices']);
assert.equal(getParentMoreMenuItemCopy('pilates')[0].description, '스튜디오 공지·알림');
assert.deepEqual(getParentMoreSwitchCopy('pilates'), {
  title: '회원·스튜디오 전환',
  description: '다른 회원 또는 스튜디오 선택',
});
assertNoForeignWords('pilates');
for (const id of PIANO_ONLY) assert.equal(ids('pilates').includes(id), false);

assert.deepEqual(ids('gym'), ['notices', 'events']);
assert.equal(getParentMoreMenuItemCopy('gym').find((i) => i.id === 'events')?.description, '체육관 행사');
assert.deepEqual(getParentMoreSwitchCopy('gym'), {
  title: '회원·체육관 전환',
  description: '다른 회원 또는 체육관 선택',
});
assertNoForeignWords('gym');
for (const id of PIANO_ONLY) assert.equal(ids('gym').includes(id), false);

assert.deepEqual(ids('retail'), ['notices']);
assert.equal(getParentMoreMenuItemCopy('retail')[0].description, '학원 공지·알림');
assert.deepEqual(getParentMoreSwitchCopy('retail'), {
  title: '원생·학원 전환',
  description: '다른 원생 또는 학원 선택',
});
assertNoForeignWords('retail');
for (const id of PIANO_ONLY) assert.equal(ids('retail').includes(id), false);
assert.equal(texts('retail').join('\n').includes('연주회'), false);
assert.equal(texts('retail').join('\n').includes('고객·샵'), false);

assert.deepEqual(ids('sauna_jjimjilbang'), ['notices']);
assert.deepEqual(ids('sauna_jjimjbang'), ids('sauna_jjimjilbang'));
assert.equal(getParentMoreMenuItemCopy('sauna_jjimjilbang')[0].description, '학원 공지·알림');
assert.deepEqual(getParentMoreSwitchCopy('sauna_jjimjilbang'), {
  title: '원생·학원 전환',
  description: '다른 원생 또는 학원 선택',
});
assertNoForeignWords('sauna_jjimjilbang');
for (const id of PIANO_ONLY) assert.equal(ids('sauna_jjimjilbang').includes(id), false);

for (const industry of ['daycare', 'pilates', 'gym', 'retail', 'sauna_jjimjilbang', 'skin_clinic']) {
  assert.equal(usesPianoParentMoreMenu(industry), false);
  assert.equal(texts(industry).join('\n').includes('학부모'), false);
}

console.log('parentMoreMenu.test.ts ok');
