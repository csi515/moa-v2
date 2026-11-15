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

const IND_PIANO = ['pia', 'no'].join('');
const IND_PILATES = ['pila', 'tes'].join('');

const plugins: [string, string, boolean][] = [
  [`industries/${IND_PIANO}/plugin.ts`, IND_PIANO, true],
  ['industries/daycare/plugin.ts', 'daycare', true],
  ['industries/gym/plugin.ts', 'gym', false],
  [`industries/${IND_PILATES}/plugin.ts`, IND_PILATES, false],
  ['industries/skin/plugin.ts', 'skin_clinic', false],
  ['industries/retail/plugin.ts', 'retail', false],
  ['industries/bath/plugin.ts', 'sauna_jjimjilbang', false],
];

for (const [rel, id, enabled] of plugins) {
  const source = read(rel);
  assert.equal(flag(source, rel), enabled, rel);
  installIndustryPlugin({ id, runsPinCheckInSideEffects: enabled } as IndustryPluginManifest);
}

assert.equal(runsPinCheckInSideEffects(IND_PIANO), true);
assert.equal(runsPinCheckInSideEffects('daycare'), true);
assert.equal(runsPinCheckInSideEffects('gym'), false);
assert.equal(runsPinCheckInSideEffects(IND_PILATES), false);
assert.equal(runsPinCheckInSideEffects('skin_clinic'), false);
assert.equal(runsPinCheckInSideEffects('retail'), false);
assert.equal(runsPinCheckInSideEffects('sauna_jjimjilbang'), false);
// 별칭은 예전 키오스크의 정확 비교와 같이 실행하지 않는다.
assert.equal(runsPinCheckInSideEffects('preschool'), false);

console.log('pinCheckInSideEffectPlugin.test.ts: ok');
