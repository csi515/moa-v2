/**
 * 원생 등록 폼 문구. 실행: npx tsx src/capabilities/roster/components/form/rosterFormCopy.test.ts
 *
 * 매니페스트 파일은 import하지 않는다. 라벨은 테스트 픽스처로만 넣는다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import { getFeeLabel, getPlaceLabel, showsTextbooksLink } from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import {
  ROSTER_TIMETABLE_PLACE_BUTTON,
  rosterAdvancedSectionTitle,
  rosterClassAssignHelper,
  rosterCreateFormDescription,
  rosterFeeInfoHeading,
  rosterNotesPlaceholder,
  rosterPostSaveHint,
  rosterRegularFeeLabel,
} from './rosterFormCopy';

function manifest(
  id: IndustryType,
  labels: { placeLabel: string; customerLabel: string; feeLabel: string },
): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'roster copy fixture' },
    theme: 'indigo',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: id === 'piano' || id === 'gym' || id === 'daycare',
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: labels.placeLabel,
    customerLabel: labels.customerLabel,
    feeLabel: labels.feeLabel,
    isAppointment: false,
    showsTextbooksLink: id === 'piano',
  };
}

installIndustryPlugin(manifest('piano', { placeLabel: '학원', customerLabel: '원생', feeLabel: '수강료' }));
installIndustryPlugin(manifest('pilates', { placeLabel: '스튜디오', customerLabel: '회원', feeLabel: '수강료' }));
installIndustryPlugin(manifest('gym', { placeLabel: '체육관', customerLabel: '회원', feeLabel: '수강료' }));
installIndustryPlugin(manifest('skin_clinic', { placeLabel: '샵', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('retail', { placeLabel: '매장', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('sauna_jjimjilbang', { placeLabel: '사업장', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('daycare', { placeLabel: '원', customerLabel: '원아', feeLabel: '보육료' }));

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function textbooksFlag(rel: string): boolean {
  const src = readFileSync(join(srcRoot, rel), 'utf8');
  const match = src.match(/showsTextbooksLink:\s*(true|false)/);
  assert.ok(match, `${rel} showsTextbooksLink`);
  return match[1] === 'true';
}

assert.equal(textbooksFlag('industries/piano/plugin.ts'), true);
for (const rel of [
  'industries/pilates/plugin.ts',
  'industries/gym/plugin.ts',
  'industries/daycare/plugin.ts',
  'industries/skin/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
]) {
  assert.equal(textbooksFlag(rel), false, rel);
}

const rosterFormFiles = [
  'capabilities/roster/components/form/rosterFormCopy.ts',
  'capabilities/roster/components/form/enrollmentFormCopy.ts',
  'capabilities/roster/components/StudentFormModal.tsx',
];
for (const rel of rosterFormFiles) {
  const src = readFileSync(join(srcRoot, rel), 'utf8');
  assert.doesNotMatch(src, /isPianoIndustry/, `${rel} still calls isPianoIndustry`);
  assert.doesNotMatch(src, /===\s*['"]piano['"]/, `${rel} still compares industry id piano`);
  assert.match(src, /showsTextbooksLink/, `${rel} does not read showsTextbooksLink`);
}

const PIANO_SERVICE = '반';
const PIANO_CONTACT = '학부모';

assert.equal(showsTextbooksLink('piano'), true);
assert.equal(rosterAdvancedSectionTitle('piano'), '수업 · 수강료');
assert.equal(
  rosterClassAssignHelper('piano', PIANO_SERVICE),
  '선택한 반이(가) 시간표·일정에 반영됩니다. 나중에 추가해도 됩니다.',
);
assert.equal(
  rosterPostSaveHint('piano', PIANO_SERVICE),
  '아직은 반·시간표에 배정되지 않았습니다. 상세를 보거나 시간표에서 직접 배치하세요.',
);
assert.equal(ROSTER_TIMETABLE_PLACE_BUTTON, '시간표에 배치');
assert.equal(
  rosterCreateFormDescription('piano', PIANO_CONTACT),
  '기본정보 → 보호자 → 수업·수강료 순으로 입력하세요',
);
assert.equal(rosterNotesPlaceholder(PIANO_CONTACT), '예: 땅콩 알레르기, 왼손 주의, 학부모 전달사항…');
assert.equal(rosterFeeInfoHeading('piano'), '수강료 정보');
assert.equal(rosterRegularFeeLabel('piano'), '정규 수업 수강료');

const others: { id: IndustryType; service: string; contact: string }[] = [
  { id: 'pilates', service: '수업', contact: '보호자' },
  { id: 'gym', service: '수업반', contact: '보호자' },
  { id: 'skin_clinic', service: '시술', contact: '연락처' },
  { id: 'retail', service: '상품', contact: '연락처' },
  { id: 'sauna_jjimjilbang', service: '시설', contact: '연락처' },
  { id: 'daycare', service: '반', contact: '보호자' },
];

for (const row of others) {
  assert.equal(showsTextbooksLink(row.id), false, row.id);
  const fee = getFeeLabel(row.id);
  const place = getPlaceLabel(row.id);
  assert.equal(rosterAdvancedSectionTitle(row.id), `수업·${fee} (선택)`);
  assert.equal(
    rosterClassAssignHelper(row.id, row.service),
    `선택한 ${row.service}은(는) 나중에 추가해도 됩니다.`,
  );
  assert.equal(rosterPostSaveHint(row.id, row.service), '다음 작업을 선택하세요.');
  assert.equal(
    rosterCreateFormDescription(row.id, row.contact),
    `기본정보 → ${row.contact} → 수업·${fee} 순으로 입력하세요`,
  );
  assert.equal(rosterNotesPlaceholder(row.contact), `예: 땅콩 알레르기, 왼손 주의, ${row.contact} 전달사항…`);
  assert.equal(rosterFeeInfoHeading(row.id), `${fee} 정보`);
  assert.equal(rosterRegularFeeLabel(row.id), `정규 수업 ${fee}`);

  const blob = [
    rosterAdvancedSectionTitle(row.id),
    rosterClassAssignHelper(row.id, row.service),
    rosterPostSaveHint(row.id, row.service),
    rosterCreateFormDescription(row.id, row.contact),
    rosterNotesPlaceholder(row.contact),
    rosterFeeInfoHeading(row.id),
    rosterRegularFeeLabel(row.id),
  ].join('\n');
  if (fee !== '수강료') {
    assert.equal(blob.includes('수강료'), false, `${row.id} said 수강료 but feeLabel is ${fee}: ${blob}`);
  }
  if (!place.includes('학원')) {
    assert.equal(blob.includes('학원'), false, `${row.id} said 학원 but placeLabel is ${place}: ${blob}`);
  }
  assert.equal(blob.includes('시간표'), false, `${row.id} mentioned 시간표: ${blob}`);
  assert.equal(blob.includes(ROSTER_TIMETABLE_PLACE_BUTTON), false, row.id);
}

console.log('rosterFormCopy.test.ts OK');
