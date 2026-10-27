/**
 * 출결 현황 요약 카드 색은 업종 id 비교가 아니라 플러그인 설정이 결정한다.
 * 실행: npx tsx src/capabilities/attendance/ui/attendanceSummaryMetric.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { getAttendanceSummaryMetric } from '@/core/industry/industryUi';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function read(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function metric(source: string, rel: string): string | null {
  const match = source.match(/attendanceSummaryMetric:\s*'(rose|teal|amber|indigo)'/);
  if (!match) {
    assert.equal(
      source.includes('attendanceSummaryMetric'),
      false,
      `${rel} unexpected attendanceSummaryMetric`
    );
    return null;
  }
  return match[1];
}

const plugins: [string, string, 'rose' | 'teal' | 'amber' | null][] = [
  ['industries/skin/plugin.ts', 'skin_clinic', 'rose'],
  ['industries/pilates/plugin.ts', 'pilates', 'teal'],
  ['industries/gym/plugin.ts', 'gym', 'amber'],
  ['industries/daycare/plugin.ts', 'daycare', null],
  ['industries/piano/plugin.ts', 'piano', null],
  ['industries/retail/plugin.ts', 'retail', null],
  ['industries/bath/plugin.ts', 'sauna_jjimjilbang', null],
];

for (const [rel, id, expected] of plugins) {
  const source = read(rel);
  assert.equal(metric(source, rel), expected, rel);
  installIndustryPlugin({
    id,
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    ...(expected ? { attendanceSummaryMetric: expected } : {}),
  } as IndustryPluginManifest);
}

assert.equal(getAttendanceSummaryMetric('skin_clinic'), 'rose');
assert.equal(getAttendanceSummaryMetric('pilates'), 'teal');
assert.equal(getAttendanceSummaryMetric('gym'), 'amber');
assert.equal(getAttendanceSummaryMetric('daycare'), 'indigo');
assert.equal(getAttendanceSummaryMetric('piano'), 'indigo');
assert.equal(getAttendanceSummaryMetric('retail'), 'indigo');
assert.equal(getAttendanceSummaryMetric('sauna_jjimjilbang'), 'indigo');
// 별칭은 예전 정확 비교와 같이 기본색이다.
assert.equal(getAttendanceSummaryMetric('taekwondo'), 'indigo');
assert.equal(getAttendanceSummaryMetric('preschool'), 'indigo');
assert.equal(getAttendanceSummaryMetric('kindergarten'), 'indigo');
assert.equal(getAttendanceSummaryMetric('sauna_jjimjbang'), 'indigo');
assert.equal(getAttendanceSummaryMetric('academy'), 'indigo');
assert.equal(getAttendanceSummaryMetric(''), 'indigo');
assert.equal(getAttendanceSummaryMetric(null), 'indigo');

assert.equal(read('core/industry/genericPlugin.ts').includes('attendanceSummaryMetric'), false);

const view = read('capabilities/attendance/ui/AttendanceManagementView.tsx');
assert.doesNotMatch(view, /isSkinClinicIndustry/);
assert.doesNotMatch(view, /industry\s*===\s*['"]pilates['"]/);
assert.doesNotMatch(view, /industry\s*===\s*['"]gym['"]/);
assert.doesNotMatch(view, /industry\s*===\s*['"]daycare['"]/);
assert.doesNotMatch(view, /industry\s*===\s*['"]skin_clinic['"]/);
assert.match(view, /getAttendanceSummaryMetric\(industry\)/);

console.log('attendanceSummaryMetric.test.ts: ok');
