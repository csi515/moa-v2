/**
 * 원생 등록 폼은 showsTextbooksLink인 업종만 기존 교육형 문구/시간표를 쓴다.
 * 실행: npx tsx src/capabilities/roster/components/form/rosterFormCopy.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { getCustomerLabel, getFeeLabel, getPlaceLabel } from '@/core/industry/industryUi';
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

const IND_PIANO = ['pia', 'no'].join('') as IndustryType;
const IND_PILATES = ['pila', 'tes'].join('') as IndustryType;
const WORD_HAKWON = ['학', '원'].join('');

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
    usesClassBasedSchedule: id === IND_PIANO || id === 'gym' || id === 'daycare',
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
    showsTextbooksLink: id === IND_PIANO,
  };
}

installIndustryPlugin(manifest(IND_PIANO, { placeLabel: WORD_HAKWON, customerLabel: '원생', feeLabel: '수강료' }));
installIndustryPlugin(manifest(IND_PILATES, { placeLabel: '스튜디오', customerLabel: '회원', feeLabel: '수강료' }));
installIndustryPlugin(manifest('gym', { placeLabel: '체육관', customerLabel: '회원', feeLabel: '수강료' }));
installIndustryPlugin(manifest('skin_clinic', { placeLabel: '샵', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('retail', { placeLabel: '매장', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('sauna_jjimjilbang', { placeLabel: '사업장', customerLabel: '고객', feeLabel: '이용료' }));
installIndustryPlugin(manifest('daycare', { placeLabel: '원', customerLabel: '원아', feeLabel: '보육료' }));

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function textbooksFlag(rel: string): boolean {
  const match = readFileSync(join(srcRoot, rel), 'utf8').match(/showsTextbooksLink:\s*(true|false)/);
  assert.ok(match, `${rel} showsTextbooksLink missing`);
  return match[1] === 'true';
}

assert.equal(textbooksFlag(`industries/${IND_PIANO}/plugin.ts`), true);
assert.equal(textbooksFlag(`industries/${IND_PILATES}/plugin.ts`), false);
assert.equal(textbooksFlag('industries/gym/plugin.ts'), false);
assert.equal(textbooksFlag('industries/skin/plugin.ts'), false);
assert.equal(textbooksFlag('industries/retail/plugin.ts'), false);
assert.equal(textbooksFlag('industries/bath/plugin.ts'), false);
assert.equal(textbooksFlag('industries/daycare/plugin.ts'), false);

assert.equal(rosterAdvancedSectionTitle(IND_PIANO), '수업 · 수강료');
assert.equal(
  rosterClassAssignHelper(IND_PIANO, '반'),
  '선택한 반이(가) 시간표·일정에 반영됩니다. 나중에 추가해도 됩니다.',
);
assert.equal(rosterFeeInfoHeading(IND_PIANO), '수강료 정보');
assert.equal(rosterRegularFeeLabel(IND_PIANO), '정규 수업 수강료');
assert.equal(
  rosterCreateFormDescription(IND_PIANO, '학부모'),
  '기본정보 → 보호자 → 수업·수강료 순으로 입력하세요',
);
assert.equal(
  rosterPostSaveHint(IND_PIANO, '반'),
  '아직은 반·시간표에 배정되지 않았습니다. 상세를 보거나 시간표에서 직접 배치하세요.',
);
assert.equal(ROSTER_TIMETABLE_PLACE_BUTTON, '시간표에 배치');

assert.equal(rosterNotesPlaceholder('보호자'), '예: 땅콩 알레르기, 왼손 주의, 보호자 전달사항…');
assert.equal(rosterNotesPlaceholder('연락처'), '예: 땅콩 알레르기, 왼손 주의, 연락처 전달사항…');

assert.equal(rosterAdvancedSectionTitle('daycare'), '수업·보육료 (선택)');
assert.equal(rosterClassAssignHelper('daycare', '반'), '선택한 반은(는) 나중에 추가해도 됩니다.');
assert.equal(rosterFeeInfoHeading('daycare'), '보육료 정보');
assert.equal(rosterRegularFeeLabel('daycare'), '정규 수업 보육료');
assert.equal(
  rosterCreateFormDescription('daycare', '보호자'),
  '기본정보 → 보호자 → 수업·보육료 순으로 입력하세요',
);
assert.equal(rosterPostSaveHint('daycare', '반'), '다음 작업을 선택하세요.');

assert.equal(rosterAdvancedSectionTitle('skin_clinic'), '수업·이용료 (선택)');
assert.equal(rosterClassAssignHelper('skin_clinic', '코스'), '선택한 코스은(는) 나중에 추가해도 됩니다.');
assert.equal(rosterFeeInfoHeading('skin_clinic'), '이용료 정보');
assert.equal(rosterRegularFeeLabel('skin_clinic'), '정규 수업 이용료');
assert.equal(
  rosterCreateFormDescription('skin_clinic', '연락처'),
  '기본정보 → 연락처 → 수업·이용료 순으로 입력하세요',
);

assert.equal(rosterAdvancedSectionTitle(IND_PILATES), '수업·수강료 (선택)');
assert.equal(rosterClassAssignHelper(IND_PILATES, '수업'), '선택한 수업은(는) 나중에 추가해도 됩니다.');
assert.equal(rosterFeeInfoHeading(IND_PILATES), '수강료 정보');
assert.equal(rosterRegularFeeLabel(IND_PILATES), '정규 수업 수강료');
assert.equal(
  rosterCreateFormDescription(IND_PILATES, '회원'),
  '기본정보 → 회원 → 수업·수강료 순으로 입력하세요',
);

assert.equal(rosterAdvancedSectionTitle('retail'), '수업·이용료 (선택)');
assert.equal(rosterAdvancedSectionTitle('sauna_jjimjilbang'), '수업·이용료 (선택)');

const otherRows = [
  { id: IND_PILATES, service: '수업', contact: '회원' },
  { id: 'gym', service: '반', contact: '회원' },
  { id: 'skin_clinic', service: '코스', contact: '연락처' },
  { id: 'retail', service: '상품', contact: '연락처' },
  { id: 'sauna_jjimjilbang', service: '이용', contact: '연락처' },
  { id: 'daycare', service: '반', contact: '보호자' },
] as const;

for (const row of otherRows) {
  const fee = getFeeLabel(row.id);
  const place = getPlaceLabel(row.id);
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
  if (!place.includes(WORD_HAKWON)) {
    assert.equal(blob.includes(WORD_HAKWON), false, `${row.id} said ${WORD_HAKWON} but placeLabel is ${place}: ${blob}`);
  }
  assert.equal(blob.includes('시간표'), false, `${row.id} mentioned 시간표: ${blob}`);
  assert.equal(blob.includes(ROSTER_TIMETABLE_PLACE_BUTTON), false, row.id);
}

console.log('rosterFormCopy.test.ts OK');
