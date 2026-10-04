/**
 * PIN 체크인 부가 동기화는 업종 id 비교가 아니라 플러그인 플래그가 결정한다.
 * 실행: npx tsx src/capabilities/attendance/application/pinCheckInSideEffectPlugin.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { runsPinCheckInSideEffects } from '@/core/industry/industryUi';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function read(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function flag(source: string, rel: string): boolean {
  const match = source.match(/runsPinCheckInSideEffects:\s*(true|false)/);
  assert.ok(match, `${rel} runsPinCheckInSideEffects missing`);
  return match[1] === 'true';
}

const plugins: [string, string, boolean][] = [
  ['industries/piano/plugin.ts', 'piano', true],
  ['industries/daycare/plugin.ts', 'daycare', true],
  ['industries/gym/plugin.ts', 'gym', false],
  ['industries/pilates/plugin.ts', 'pilates', false],
  ['industries/skin/plugin.ts', 'skin_clinic', false],
  ['industries/retail/plugin.ts', 'retail', false],
  ['industries/bath/plugin.ts', 'sauna_jjimjilbang', false],
];

for (const [rel, id, enabled] of plugins) {
  const source = read(rel);
  assert.equal(flag(source, rel), enabled, rel);
  installIndustryPlugin({ id, runsPinCheckInSideEffects: enabled } as IndustryPluginManifest);
}

assert.equal(runsPinCheckInSideEffects('piano'), true);
assert.equal(runsPinCheckInSideEffects('daycare'), true);
assert.equal(runsPinCheckInSideEffects('gym'), false);
assert.equal(runsPinCheckInSideEffects('pilates'), false);
assert.equal(runsPinCheckInSideEffects('skin_clinic'), false);
assert.equal(runsPinCheckInSideEffects('retail'), false);
assert.equal(runsPinCheckInSideEffects('sauna_jjimjilbang'), false);
// 별칭은 예전 키오스크의 정확 비교와 같이 실행하지 않는다.
assert.equal(runsPinCheckInSideEffects('preschool'), false);
assert.equal(runsPinCheckInSideEffects('kindergarten'), false);
assert.equal(runsPinCheckInSideEffects('taekwondo'), false);
assert.equal(runsPinCheckInSideEffects(''), false);
assert.equal(runsPinCheckInSideEffects(null), false);

assert.match(read('core/industry/genericPlugin.ts'), /runsPinCheckInSideEffects:\s*false/);

const kiosk = read('capabilities/attendance/ui/PinCheckInKioskView.tsx');
assert.doesNotMatch(kiosk, /industry\s*===\s*['"]piano['"]/);
assert.doesNotMatch(kiosk, /industry\s*===\s*['"]daycare['"]/);
assert.match(kiosk, /runsPinCheckInSideEffects\(industry\)/);
assert.match(kiosk, /runPinCheckInSideEffects\(result\.customerId\)/);

const sideEffect = read('capabilities/attendance/application/pinCheckInSideEffects.ts');
assert.match(sideEffect, /export async function runPinCheckInSideEffects/);

console.log('pinCheckInSideEffectPlugin.test.ts: ok');
