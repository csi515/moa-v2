/**
 * 보호자 행사 제목. 실행: npx tsx src/modules/parent/views/parentEventsSectionTitle.test.ts
 *
 * 매니페스트 파일은 import하지 않는다. retail/bath placeLabel은 main에서 아직 학원일 수 있어
 * 그 플러그인을 기대하지 않고, 테스트 안에서 placeLabel만 덮어쓴다.
 */
import assert from 'node:assert/strict';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import { getPlaceLabel } from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { parentEventsSectionTitle } from './parentEventsSectionTitle';

function manifest(id: IndustryType, placeLabel: string): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'title helper fixture' },
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
  };
}

installIndustryPlugin(manifest('piano', '학원'));
installIndustryPlugin(manifest('gym', '체육관'));
installIndustryPlugin(manifest('daycare', '원'));
installIndustryPlugin(manifest('pilates', '스튜디오'));
installIndustryPlugin(manifest('skin_clinic', '샵'));
installIndustryPlugin(manifest('academy', '센터'));

function assertNoAcademyUnlessPlaceIs(industry: string): void {
  const place = getPlaceLabel(industry);
  const title = parentEventsSectionTitle(industry);
  if (!place.includes('학원')) {
    assert.equal(title.includes('학원'), false, `${industry} title leaked 학원: ${title} (place=${place})`);
  }
}

assert.equal(parentEventsSectionTitle('piano'), '학원 일정·행사');
assert.equal(parentEventsSectionTitle('gym'), '체육관 일정');
assert.equal(parentEventsSectionTitle('daycare'), '원 일정');

assert.equal(getPlaceLabel('pilates'), '스튜디오');
assert.equal(parentEventsSectionTitle('pilates'), '스튜디오 일정·행사');
assertNoAcademyUnlessPlaceIs('pilates');

assert.equal(getPlaceLabel('skin_clinic'), '샵');
assert.equal(parentEventsSectionTitle('skin_clinic'), '샵 일정·행사');
assertNoAcademyUnlessPlaceIs('skin_clinic');

assert.equal(getPlaceLabel('academy'), '센터');
assert.equal(parentEventsSectionTitle('academy'), '센터 일정·행사');
assertNoAcademyUnlessPlaceIs('academy');

assert.equal(getPlaceLabel('piano'), '학원');
assert.equal(parentEventsSectionTitle('piano').includes('학원'), true);

console.log('parentEventsSectionTitle.test.ts OK');
