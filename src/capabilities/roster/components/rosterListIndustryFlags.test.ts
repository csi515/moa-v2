/**
 * 공유 명단은 업종 id가 아니라 rosterList 플래그를 따른다.
 * 실행: npm run test:roster-list-flags
 *
 * 회차권·수강 형태 열과 상세 필터는 피아노만, 종료 칩은 피부만.
 * 빈 업종은 플러그인이 피아노로 떨어져도 기본 목록을 유지한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest, IndustryRosterListConfig } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import {
  getRosterListPresentation,
  rosterFilterEmptyDescription,
  rosterSearchPlaceholder,
} from '@/core/industry/industryUi';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readRosterList(rel: string): IndustryRosterListConfig | null {
  const src = readSrc(rel);
  const match = src.match(/rosterList:\s*\{([^}]*)\}/);
  if (!match) return null;
  const parsed: Record<string, string | boolean | number> = {};
  for (const entry of match[1].matchAll(/(\w+):\s*(?:'([^']*)'|(true|false)|(\d+))/g)) {
    const key = entry[1];
    if (entry[2] !== undefined) parsed[key] = entry[2];
    else if (entry[3] !== undefined) parsed[key] = entry[3] === 'true';
    else parsed[key] = Number(entry[4]);
  }
  return parsed as IndustryRosterListConfig;
}

function manifest(id: IndustryType, rosterList?: IndustryRosterListConfig): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'roster list fixture' },
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
    rosterList,
  };
}

const list = readSrc('capabilities/roster/components/StudentListView.tsx');
assert.doesNotMatch(list, /industry\s*===/);
assert.doesNotMatch(list, /isSkinClinicIndustry/);
assert.doesNotMatch(list, /\bisPiano\b/);
assert.match(list, /getRosterListPresentation\(industry\)/);
assert.match(list, /showSessionColumns \? ScheduleService\.getSessionPasses\(\)/);
assert.match(
  list,
  /\{showSessionColumns && <th className="py-2\.5 px-3">\{enrollmentModeLabel\(industry\)\}<\/th>\}/,
);
assert.match(list, /\{showSessionColumns && <th className="py-2\.5 px-3">회차권<\/th>\}/);
assert.match(list, /\{labels\.service\.singular\}/);
assert.match(readSrc('industries/piano/config/labels.ts'), /singular:\s*'반'/);

const piano = readRosterList('industries/piano/plugin.ts');
assert.ok(piano);
assert.equal(piano.searchPlaceholder, '학생·학부모 이름 또는 전화번호');
assert.equal(piano.filterButtonAriaLabel, '추가 필터 (담당 선생님, 반, 요일, 정렬)');
assert.equal(piano.showFilterFieldLabels, true);
assert.equal(piano.staffFilterLabel, '담당 선생님');
assert.equal(piano.controlMinHeight, 44);
assert.equal(piano.fitAdvancedFilterGrid, true);
assert.equal(piano.showSessionColumns, true);
assert.equal(piano.withdrawnLabel, undefined);
assert.equal(piano.filterEmptyUsesSearchHint, undefined);

const skin = readRosterList('industries/skin/plugin.ts');
assert.ok(skin);
assert.equal(skin.withdrawnLabel, '종료');
assert.equal(skin.filterEmptyUsesSearchHint, true);
assert.equal(skin.showSessionColumns, undefined);
assert.equal(skin.showFilterFieldLabels, undefined);
assert.equal(skin.fitAdvancedFilterGrid, undefined);

const withoutRosterList = [
  'industries/gym/plugin.ts',
  'industries/daycare/plugin.ts',
  'industries/pilates/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'core/industry/genericPlugin.ts',
];
for (const rel of withoutRosterList) {
  assert.equal(readRosterList(rel), null, rel);
}

installIndustryPlugin(manifest('piano', piano));
installIndustryPlugin(manifest('skin_clinic', skin));
installIndustryPlugin(manifest('gym'));
installIndustryPlugin(manifest('daycare'));
installIndustryPlugin(manifest('pilates'));
installIndustryPlugin(manifest('retail'));
installIndustryPlugin(manifest('sauna_jjimjilbang'));

const pianoView = getRosterListPresentation('piano');
assert.equal(pianoView.showSessionColumns, true);
assert.equal(pianoView.showFilterFieldLabels, true);
assert.equal(pianoView.staffFilterLabel, '담당 선생님');
assert.equal(pianoView.controlMinHeight, 44);
assert.equal(pianoView.fitAdvancedFilterGrid, true);
assert.equal(pianoView.withdrawnLabel, '퇴원');
assert.equal(pianoView.filterEmptyUsesSearchHint, false);
assert.equal(rosterSearchPlaceholder(pianoView, '학부모'), '학생·학부모 이름 또는 전화번호');
assert.equal(
  rosterFilterEmptyDescription(pianoView, '학생'),
  '퇴원 상태의 학생은 ‘퇴원’ 또는 ‘전체’ 필터에서 볼 수 있습니다.',
);

const skinView = getRosterListPresentation('skin_clinic');
assert.equal(skinView.showSessionColumns, false);
assert.equal(skinView.showFilterFieldLabels, false);
assert.equal(skinView.controlMinHeight, 36);
assert.equal(skinView.fitAdvancedFilterGrid, false);
assert.equal(skinView.withdrawnLabel, '종료');
assert.equal(skinView.filterEmptyUsesSearchHint, true);
assert.equal(rosterSearchPlaceholder(skinView, '연락처'), '이름 · 연락처 · 연락처 전화');
assert.equal(
  rosterFilterEmptyDescription(skinView, '고객'),
  '검색어나 필터를 바꿔보세요. 종료 고객은 ‘종료’ 또는 ‘전체’에서 볼 수 있습니다.',
);

for (const id of ['gym', 'daycare', 'pilates', 'retail', 'sauna_jjimjilbang', 'academy', 'future_industry'] as const) {
  const view = getRosterListPresentation(id);
  assert.equal(view.showSessionColumns, false, id);
  assert.equal(view.showFilterFieldLabels, false, id);
  assert.equal(view.fitAdvancedFilterGrid, false, id);
  assert.equal(view.withdrawnLabel, '퇴원', id);
  assert.equal(view.filterEmptyUsesSearchHint, false, id);
  assert.equal(view.controlMinHeight, 36, id);
  assert.equal(
    rosterFilterEmptyDescription(view, '회원'),
    '퇴원 상태의 회원은 ‘퇴원’ 또는 ‘전체’ 필터에서 볼 수 있습니다.',
    id,
  );
}

for (const blank of [null, undefined, '', '   ']) {
  const view = getRosterListPresentation(blank);
  assert.equal(view.showSessionColumns, false, JSON.stringify(blank));
  assert.equal(view.withdrawnLabel, '퇴원', JSON.stringify(blank));
  assert.equal(view.filterEmptyUsesSearchHint, false, JSON.stringify(blank));
}

console.log('rosterListIndustryFlags.test.ts ok');
