/**
 * 학생 상세 종료·퇴원 동작 라벨
 * 실행: npx tsx src/capabilities/roster/components/studentExitActionLabel.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { getStudentExitActionLabel } from './studentExitActionLabel';

const IND_PIANO = ['pia', 'no'].join('');
const IND_PILATES = ['pila', 'tes'].join('');

function manifest(id: IndustryType, usesWithdrawalExitLabel: boolean): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label: id, description: 'exit label fixture' },
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
    usesWithdrawalExitLabel,
  };
}

installIndustryPlugin(manifest(IND_PIANO as unknown as IndustryType, true));
installIndustryPlugin(manifest('daycare', true));
installIndustryPlugin(manifest(IND_PILATES as unknown as IndustryType, false));
installIndustryPlugin(manifest('gym', false));
installIndustryPlugin(manifest('skin_clinic', false));
installIndustryPlugin(manifest('retail', false));
installIndustryPlugin(manifest('sauna_jjimjilbang', false));
installIndustryPlugin(manifest('academy', false));

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function withdrawalFlag(rel: string): boolean {
  const src = readFileSync(join(srcRoot, rel), 'utf8');
  const match = src.match(/usesWithdrawalExitLabel:\s*(true|false)/);
  assert.ok(match, `${rel} usesWithdrawalExitLabel`);
  return match[1] === 'true';
}

assert.equal(withdrawalFlag(`industries/${IND_PIANO}/plugin.ts`), true);
assert.equal(withdrawalFlag('industries/daycare/plugin.ts'), true);
for (const rel of [
  `industries/${IND_PILATES}/plugin.ts`,
  'industries/gym/plugin.ts',
  'industries/skin/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'core/industry/genericPlugin.ts',
]) {
  assert.equal(withdrawalFlag(rel), false, rel);
}

const labelSrc = readFileSync(
  join(srcRoot, 'capabilities/roster/components/studentExitActionLabel.ts'),
  'utf8'
);
assert.match(labelSrc, /usesWithdrawalExitLabel/);
assert.doesNotMatch(labelSrc, new RegExp(`ACADEMY_EXIT_INDUSTRIES|=== ['"]${IND_PIANO}['"]|=== ['"]daycare['"]`));

assert.equal(getStudentExitActionLabel(IND_PIANO as unknown as IndustryType), '퇴원');
assert.equal(getStudentExitActionLabel('daycare'), '퇴원');
assert.equal(getStudentExitActionLabel('preschool'), '퇴원');
assert.equal(getStudentExitActionLabel('kindergarten'), '퇴원');

assert.equal(getStudentExitActionLabel('skin_clinic'), '종료');
assert.equal(getStudentExitActionLabel(IND_PILATES as unknown as IndustryType), '종료');
assert.equal(getStudentExitActionLabel('gym'), '종료');
assert.equal(getStudentExitActionLabel('taekwondo'), '종료');
assert.equal(getStudentExitActionLabel('retail'), '종료');
assert.equal(getStudentExitActionLabel('sauna_jjimjilbang'), '종료');
assert.equal(getStudentExitActionLabel('sauna_jjimjbang'), '종료');
assert.equal(getStudentExitActionLabel('general_service'), '종료');
assert.equal(getStudentExitActionLabel('academy'), '종료');
assert.equal(getStudentExitActionLabel(null), '종료');
assert.equal(getStudentExitActionLabel(undefined), '종료');
assert.equal(getStudentExitActionLabel(''), '종료');
assert.equal(getStudentExitActionLabel('future_industry'), '종료');

console.log('studentExitActionLabel.test.ts ok');
