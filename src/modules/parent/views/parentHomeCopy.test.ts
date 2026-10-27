/**
 * 보호자 홈 문구. 실행: npx tsx src/modules/parent/views/parentHomeCopy.test.ts
 *
 * 매니페스트 파일은 import하지 않는다. retail/bath placeLabel은 main에서 아직 학원일 수 있어
 * 플러그인을 고치지 않고, 테스트 픽스처로만 라벨을 덮어쓴다.
 */
import assert from 'node:assert/strict';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import { getCustomerLabel, getFeeLabel, getPlaceLabel } from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { parentHomeFallbackCopy, parentHomeLayout } from './parentHomeCopy';

const PIANO_ONLY = ['과제', '연주회', '교재'] as const;

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
    option: { value: id, label: id, description: 'home copy fixture' },
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

installIndustryPlugin(manifest('piano', {
  placeLabel: '학원',
  customerLabel: '원생',
  feeLabel: '수강료',
  showsTextbooksLink: true,
}));
installIndustryPlugin(manifest('daycare', {
  placeLabel: '원',
  customerLabel: '원아',
  feeLabel: '보육료',
}));
installIndustryPlugin(manifest('gym', {
  placeLabel: '체육관',
  customerLabel: '회원',
  feeLabel: '수강료',
}));
installIndustryPlugin(manifest('pilates', {
  placeLabel: '스튜디오',
  customerLabel: '회원',
  feeLabel: '수강료',
  isAppointment: true,
}));
installIndustryPlugin(manifest('skin_clinic', {
  placeLabel: '샵',
  customerLabel: '고객',
  feeLabel: '이용료',
  isAppointment: true,
}));
installIndustryPlugin(manifest('retail', {
  placeLabel: '학원',
  customerLabel: '원생',
  feeLabel: '수강료',
}));
installIndustryPlugin(manifest('sauna_jjimjilbang', {
  placeLabel: '학원',
  customerLabel: '원생',
  feeLabel: '수강료',
}));
installIndustryPlugin(manifest('academy', {
  placeLabel: '센터',
  customerLabel: '수강생',
  feeLabel: '이용료',
}));
installIndustryPlugin(manifest('cafe', {
  placeLabel: '매장',
  customerLabel: '손님',
  feeLabel: '결제',
}));

function fallbackBlob(industry: string): string {
  const copy = parentHomeFallbackCopy(industry);
  assert.ok(copy, `${industry} should use fallback home`);
  return [copy.hint, copy.attendanceLabel, copy.feeActionLabel, ...copy.sections.map((s) => s.title)].join('\n');
}

function assertNoPianoOnly(industry: string, blob: string): void {
  for (const word of PIANO_ONLY) {
    assert.equal(blob.includes(word), false, `${industry} gained piano-only 「${word}」: ${blob}`);
  }
}

assert.equal(parentHomeLayout('piano'), 'piano');
assert.equal(parentHomeFallbackCopy('piano'), null);
assert.equal(parentHomeLayout('daycare'), 'daycare');
assert.equal(parentHomeFallbackCopy('daycare'), null);
assert.equal(parentHomeLayout('gym'), 'gym');
assert.equal(parentHomeFallbackCopy('gym'), null);
assert.equal(parentHomeLayout('pilates'), 'pilates');
assert.equal(parentHomeFallbackCopy('pilates'), null);
assert.equal(parentHomeLayout('skin_clinic'), 'skin');
assert.equal(parentHomeFallbackCopy('skin_clinic'), null);

for (const industry of ['retail', 'sauna_jjimjilbang', 'academy', 'cafe'] as const) {
  assert.equal(parentHomeLayout(industry), 'fallback', industry);
  const copy = parentHomeFallbackCopy(industry);
  assert.ok(copy);
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const fee = getFeeLabel(industry);
  assert.equal(
    copy.hint,
    `${place} ${customer}의 출결·${fee}·안내는 아래 메뉴에서 확인할 수 있습니다.`,
  );
  assert.equal(copy.attendanceLabel, '출결');
  assert.equal(copy.feeActionLabel, fee);
  assert.deepEqual(copy.sections.map((s) => s.title), ['출결', fee]);
  assert.deepEqual(copy.sections.map((s) => s.id), ['attendance', 'tuition']);
  const blob = fallbackBlob(industry);
  assertNoPianoOnly(industry, blob);
  if (!place.includes('학원')) {
    assert.equal(blob.includes('학원'), false, `${industry} said 학원 but placeLabel is ${place}: ${blob}`);
  }
}

assert.equal(getPlaceLabel('academy'), '센터');
assert.equal(parentHomeFallbackCopy('academy')?.hint.includes('센터'), true);
assert.equal(parentHomeFallbackCopy('academy')?.hint.includes('학원'), false);
assert.equal(getPlaceLabel('cafe'), '매장');
assert.equal(parentHomeFallbackCopy('cafe')?.hint.includes('학원'), false);

assert.equal(getPlaceLabel('retail'), '학원');
assert.equal(parentHomeFallbackCopy('retail')?.hint.includes('학원'), true);
assert.equal(parentHomeFallbackCopy('sauna_jjimjilbang')?.hint.includes('학원'), true);

console.log('parentHomeCopy.test.ts OK');
