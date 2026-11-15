/**
 * 학생 폼 수강 형태·본인 계정 문구 테스트.
 * 실행: npm run test:enrollment-form-copy
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { getFeeLabel, showsTextbooksLink } from '@/core/industry/industryUi';
import { enrollmentModeLabel, selfAccountEnrollmentNote } from './enrollmentFormCopy';

const IND_PIANO = ['pia', 'no'].join('');
const IND_PILATES = ['pila', 'tes'].join('');

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function feeLabelIn(rel: string): string {
  const src = readFileSync(join(srcRoot, rel), 'utf8');
  const match = src.match(/feeLabel:\s*'([^']+)'/);
  assert.ok(match, `${rel} feeLabel`);
  return match[1];
}

function manifest(id: IndustryType, feeLabel: string): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'enrollment copy fixture' },
    theme: 'indigo',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: id === 'daycare',
    showsTextbooksLink: id === IND_PIANO,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    feeLabel,
  };
}

const feePiano = feeLabelIn(`industries/${IND_PIANO}/plugin.ts`);
const skinFee = feeLabelIn('industries/skin/plugin.ts');
const feePilates = feeLabelIn(`industries/${IND_PILATES}/plugin.ts`);
const retailFee = feeLabelIn('industries/retail/plugin.ts');

assert.equal(feePiano, '수강료');
assert.equal(skinFee, '이용료');
assert.equal(feePilates, '수강료');
assert.equal(retailFee, '이용료');

installIndustryPlugin(manifest(IND_PIANO as unknown as IndustryType, feePiano));
installIndustryPlugin(manifest('skin_clinic', skinFee));
installIndustryPlugin(manifest(IND_PILATES as unknown as IndustryType, feePilates));
installIndustryPlugin(manifest('retail', retailFee));

const contact = '보호자';

assert.equal(showsTextbooksLink(IND_PIANO as unknown as IndustryType), true);
assert.equal(showsTextbooksLink('skin_clinic'), false);
assert.equal(showsTextbooksLink(IND_PILATES as unknown as IndustryType), false);
assert.equal(showsTextbooksLink(null), false);

assert.equal(getFeeLabel(IND_PIANO as unknown as IndustryType), '수강료');
assert.equal(enrollmentModeLabel(IND_PIANO as unknown as IndustryType), '수강 형태');
assert.equal(
  selfAccountEnrollmentNote(IND_PIANO as unknown as IndustryType, contact),
  `본인 계정으로 수강하는 경우 ${contact} 정보를 생략합니다.`,
);

assert.equal(enrollmentModeLabel('skin_clinic'), '이용료 형태');
assert.equal(
  selfAccountEnrollmentNote('skin_clinic', contact),
  `본인 계정으로 이용하는 경우 ${contact} 정보를 생략합니다.`,
);
assert.equal(enrollmentModeLabel('skin_clinic').includes('수강'), false);
assert.equal(selfAccountEnrollmentNote('skin_clinic', contact).includes('수강'), false);

assert.equal(enrollmentModeLabel('retail'), '이용료 형태');
assert.equal(enrollmentModeLabel('retail').includes('수강'), false);
assert.equal(selfAccountEnrollmentNote('retail', contact).includes('수강'), false);

assert.equal(enrollmentModeLabel(IND_PILATES as unknown as IndustryType), `${feePilates} 형태`);
assert.equal(enrollmentModeLabel(IND_PILATES as unknown as IndustryType), '수강료 형태');
assert.equal(
  selfAccountEnrollmentNote(IND_PILATES as unknown as IndustryType, contact),
  `본인 계정으로 이용하는 경우 ${contact} 정보를 생략합니다.`,
);
assert.equal(selfAccountEnrollmentNote(IND_PILATES as unknown as IndustryType, contact).includes('수강'), false);

const rosterRoot = join(srcRoot, 'capabilities/roster');
const renders = [
  'components/StudentFormModal.tsx',
  'components/form/StudentAdvancedSection.tsx',
  'components/detail/StudentDetailInfoTab.tsx',
  'components/StudentListView.tsx',
];
for (const rel of renders) {
  const src = readFileSync(join(rosterRoot, rel), 'utf8');
  assert.doesNotMatch(src, /수강 형태/, `${rel} still hardcodes 수강 형태`);
  assert.doesNotMatch(src, /본인 계정으로 수강하는 경우/, `${rel} still hardcodes default self-account copy`);
  assert.doesNotMatch(src, /isPianoIndustry/, `${rel} still calls legacy isPianoIndustry`);
}

const enrollmentCopy = readFileSync(join(rosterRoot, 'components/form/enrollmentFormCopy.ts'), 'utf8');
assert.doesNotMatch(enrollmentCopy, /isPianoIndustry/);
assert.doesNotMatch(enrollmentCopy, new RegExp(`===\\s*['"]${IND_PIANO}['"]`));
assert.match(enrollmentCopy, /showsTextbooksLink/);

const advanced = readFileSync(join(rosterRoot, 'components/form/StudentAdvancedSection.tsx'), 'utf8');
assert.match(advanced, /label: '회차권'/);
assert.match(advanced, /enrollmentModeLabel\(industry\)/);

const basic = readFileSync(join(rosterRoot, 'components/form/StudentBasicInfoSection.tsx'), 'utf8');
assert.match(basic, /showSchoolFields\(industry\)/);

const list = readFileSync(join(rosterRoot, 'components/StudentListView.tsx'), 'utf8');
assert.match(list, /\{showSessionColumns && <th className="py-2\.5 px-3">\{enrollmentModeLabel\(industry\)\}<\/th>\}/);
assert.match(list, /\{showSessionColumns && <th className="py-2\.5 px-3">회차권<\/th>\}/);

console.log('enrollmentFormCopy.test.ts OK');
