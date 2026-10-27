/**
 * 소매·사우나 매니페스트에 학원/피아노 예시가 남지 않는지.
 * 실행: npx tsx src/core/industry/retailBathManifestCopy.test.ts
 */
import assert from 'node:assert/strict';
import { bathPluginManifest } from '@/industries/bath/plugin';
import { retailPluginManifest } from '@/industries/retail/plugin';

const LEAK = /학원|원생|수강료|피아노|선율/;

function assertNoLeak(label: string, value: unknown): void {
  const text = JSON.stringify(value);
  assert.equal(LEAK.test(text), false, `${label} still contains academy/piano copy: ${text}`);
}

assertNoLeak('retail', retailPluginManifest);
assertNoLeak('bath', bathPluginManifest);

assert.equal(retailPluginManifest.placeLabel, '매장');
assert.equal(retailPluginManifest.placeNamePlaceholder, '예: 행복 매장');
assert.equal(retailPluginManifest.customerLabel, '고객');
assert.equal(retailPluginManifest.feeLabel, '이용료');
assert.equal(retailPluginManifest.roomConfig?.sectionTitle, '공간');
assert.equal(
  retailPluginManifest.bankAccountPlaceholder,
  '예: 국민은행 000000-00-000000 (예금주: 홍길동)'
);
assert.equal(retailPluginManifest.roomConfig?.placeholder, '예: 1실');

assert.equal(bathPluginManifest.placeLabel, '사업장');
assert.equal(bathPluginManifest.placeNamePlaceholder, '예: 행복 사업장');
assert.equal(bathPluginManifest.customerLabel, '고객');
assert.equal(bathPluginManifest.feeLabel, '이용료');
assert.equal(bathPluginManifest.roomConfig?.sectionTitle, '공간');
assert.equal(
  bathPluginManifest.bankAccountPlaceholder,
  '예: 국민은행 000000-00-000000 (예금주: 홍길동)'
);
assert.equal(bathPluginManifest.roomConfig?.placeholder, '예: 1실');

console.log('retailBathManifestCopy.test.ts OK');
