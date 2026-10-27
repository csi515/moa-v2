/**
 * 학생 상세 종료·퇴원 동작 라벨
 * 실행: npx tsx src/capabilities/roster/components/studentExitActionLabel.test.ts
 *
 * 매니페스트 파일은 import하지 않는다. 플래그는 테스트 픽스처와 소스 선언으로 확인한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { getStudentExitActionLabel } from './studentExitActionLabel';

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

installIndustryPlugin(manifest('piano', true));
installIndustryPlugin(manifest('daycare', true));
installIndustryPlugin(manifest('pilates', false));
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

assert.equal(withdrawalFlag('industries/piano/plugin.ts'), true);
assert.equal(withdrawalFlag('industries/daycare/plugin.ts'), true);
for (const rel of [
  'industries/pilates/plugin.ts',
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
assert.doesNotMatch(labelSrc, /ACADEMY_EXIT_INDUSTRIES|=== ['"]piano['"]|=== ['"]daycare['"]/);

assert.equal(getStudentExitActionLabel('piano'), '퇴원');
assert.equal(getStudentExitActionLabel('daycare'), '퇴원');
assert.equal(getStudentExitActionLabel('preschool'), '퇴원');
assert.equal(getStudentExitActionLabel('kindergarten'), '퇴원');

assert.equal(getStudentExitActionLabel('skin_clinic'), '종료');
assert.equal(getStudentExitActionLabel('pilates'), '종료');
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
