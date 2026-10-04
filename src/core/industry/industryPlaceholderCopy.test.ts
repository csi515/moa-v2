/**
 * 범용 매니페스트와 비피아노 업종 매니페스트에 피아노·선율 예시가 남지 않는지.
 * 실행: npx tsx src/core/industry/industryPlaceholderCopy.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGenericPluginManifest } from './genericPlugin';
import type { IndustryDefinition } from './catalog';
import { bathPluginManifest } from '@/industries/bath/plugin';
import { daycarePluginManifest } from '@/industries/daycare/plugin';
import { gymPluginManifest } from '@/industries/gym/plugin';
import { pilatesPluginManifest } from '@/industries/pilates/plugin';
import { retailPluginManifest } from '@/industries/retail/plugin';

const LEAK = /피아노|선율/;

const academy: IndustryDefinition = {
  id: 'academy',
  label: '학원 (교과·종합)',
  description: '교과 학원',
  category: 'education',
  selectable: false,
};

const other: IndustryDefinition = {
  id: 'music_academy',
  label: '음악학원',
  description: '기악',
  category: 'education',
  selectable: false,
};

function assertNoLeak(label: string, value: unknown): void {
  const text = JSON.stringify(value);
  assert.equal(LEAK.test(text), false, `${label} still contains piano/seonyul copy: ${text}`);
}

const genericAcademy = buildGenericPluginManifest(academy);
const genericOther = buildGenericPluginManifest(other);

assertNoLeak('generic academy', genericAcademy);
assertNoLeak('generic other', genericOther);

assert.equal(genericAcademy.placeLabel, '사업장');
assert.equal(genericAcademy.placeNamePlaceholder, '예: 행복 사업장');
assert.equal(genericAcademy.customerLabel, '고객');
assert.equal(genericAcademy.feeLabel, '이용료');
assert.equal(
  genericAcademy.bankAccountPlaceholder,
  '예: 국민은행 000000-00-000000 (예금주: 홍길동)'
);
assert.equal(genericAcademy.roomConfig?.sectionTitle, '공간');
assert.equal(genericAcademy.roomConfig?.placeholder, '예: 1실');
assert.equal(genericAcademy.ownerLabel, '원장');
assert.equal(genericOther.ownerLabel, '대표');

const manifests = {
  retail: retailPluginManifest,
  bath: bathPluginManifest,
  gym: gymPluginManifest,
  daycare: daycarePluginManifest,
  pilates: pilatesPluginManifest,
};

for (const [name, manifest] of Object.entries(manifests)) {
  assertNoLeak(name, manifest);
}

assert.equal(pilatesPluginManifest.bankAccountPlaceholder, '예: 국민은행 123456-04-123456 (예금주: 스튜디오)');
assert.equal(gymPluginManifest.bankAccountPlaceholder, '예: 국민은행 123456-04-123456 (예금주: 체육관)');
assert.equal(daycarePluginManifest.bankAccountPlaceholder, '예: 국민은행 123456-04-123456 (예금주: 어린이집)');
assert.equal(retailPluginManifest.bankAccountPlaceholder, '예: 국민은행 000000-00-000000 (예금주: 홍길동)');
assert.equal(bathPluginManifest.bankAccountPlaceholder, '예: 국민은행 000000-00-000000 (예금주: 홍길동)');
assert.equal(gymPluginManifest.roomConfig?.placeholder, '예: 1실');
assert.equal(daycarePluginManifest.roomConfig?.placeholder, '예: 1실');
assert.equal(retailPluginManifest.roomConfig?.placeholder, '예: 1실');
assert.equal(bathPluginManifest.roomConfig?.placeholder, '예: 1실');

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../..');
for (const rel of [
  'core/industry/genericPlugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'industries/gym/plugin.ts',
  'industries/daycare/plugin.ts',
  'industries/pilates/plugin.ts',
]) {
  const source = readFileSync(join(srcRoot, rel), 'utf8');
  assert.equal(LEAK.test(source), false, `${rel} source still contains 피아노 or 선율`);
}

console.log('industryPlaceholderCopy.test.ts OK');
