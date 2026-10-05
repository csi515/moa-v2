/**
 * 학생 폼 수강 형태·본인 계정 문구.
 * 실행: npm run test:enrollment-form-copy
 *
 * 피아노 feeLabel은 수강료라 그대로 붙이면 `수강료 형태`가 된다.
 * 료를 빼면 필라테스(수강료)도 수강이 되므로 피아노만 기존 문장을 유지한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { getFeeLabel, isPianoIndustry } from '@/core/industry/industryUi';
import { enrollmentModeLabel, selfAccountEnrollmentNote } from './enrollmentFormCopy';

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
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    feeLabel,
  };
}

const pianoFee = feeLabelIn('industries/piano/plugin.ts');
const skinFee = feeLabelIn('industries/skin/plugin.ts');
const pilatesFee = feeLabelIn('industries/pilates/plugin.ts');
const retailFee = feeLabelIn('industries/retail/plugin.ts');

assert.equal(pianoFee, '수강료');
assert.equal(skinFee, '이용료');
assert.equal(pilatesFee, '수강료');
assert.equal(retailFee, '이용료');

installIndustryPlugin(manifest('piano', pianoFee));
installIndustryPlugin(manifest('skin_clinic', skinFee));
installIndustryPlugin(manifest('pilates', pilatesFee));
installIndustryPlugin(manifest('retail', retailFee));

const contact = '보호자';

assert.equal(isPianoIndustry('piano'), true);
assert.equal(isPianoIndustry('skin_clinic'), false);
assert.equal(isPianoIndustry('pilates'), false);
assert.equal(isPianoIndustry(null), false);

assert.equal(getFeeLabel('piano'), '수강료');
assert.equal(enrollmentModeLabel('piano'), '수강 형태');
assert.equal(
  selfAccountEnrollmentNote('piano', contact),
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

assert.equal(enrollmentModeLabel('pilates'), `${pilatesFee} 형태`);
assert.equal(enrollmentModeLabel('pilates'), '수강료 형태');
assert.equal(
  selfAccountEnrollmentNote('pilates', contact),
  `본인 계정으로 이용하는 경우 ${contact} 정보를 생략합니다.`,
);
assert.equal(selfAccountEnrollmentNote('pilates', contact).includes('수강'), false);

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
  assert.doesNotMatch(src, /본인 계정으로 수강하는 경우/, `${rel} still hardcodes piano self-account copy`);
}

const advanced = readFileSync(join(rosterRoot, 'components/form/StudentAdvancedSection.tsx'), 'utf8');
assert.match(advanced, /label: '회차권'/);
assert.match(advanced, /enrollmentModeLabel\(industry\)/);

const basic = readFileSync(join(rosterRoot, 'components/form/StudentBasicInfoSection.tsx'), 'utf8');
assert.match(basic, /showSchoolFields\(industry\)/);

const list = readFileSync(join(rosterRoot, 'components/StudentListView.tsx'), 'utf8');
assert.match(list, /\{showSessionColumns && <th className="py-2\.5 px-3">\{enrollmentModeLabel\(industry\)\}<\/th>\}/);
assert.match(list, /\{showSessionColumns && <th className="py-2\.5 px-3">회차권<\/th>\}/);

console.log('enrollmentFormCopy.test.ts OK');
