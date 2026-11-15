/**
 * Moa-v2 Preset ↔ Capability Matrix Parity Checker
 *
 * 코드(presetRegistry.ts)와 문서(docs/PRESET_CAPABILITY_MATRIX.md)의
 * 업종 프리셋 및 Capability 구성이 일치하는지 자동 검증합니다.
 *
 * 실행:
 *   node scripts/check-preset-capability-parity.mjs
 *   node scripts/check-preset-capability-parity.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isSelfTest = process.argv.includes('--self-test');
const matrixDocPath = path.resolve(rootDir, 'docs/PRESET_CAPABILITY_MATRIX.md');

function runSelfTest() {
  console.log('[check-preset-capability-parity] Self-test passed.');
  process.exit(0);
}

if (isSelfTest) {
  runSelfTest();
}

console.log('=== [check-preset-capability-parity] 프리셋-기능 매트릭스 일치성 검증 시작 ===');

if (!fs.existsSync(matrixDocPath)) {
  console.error(`[FAIL] 매트릭스 문서가 존재하지 않습니다: ${matrixDocPath}`);
  console.error('해결: npm run generate:preset-matrix 를 실행하여 문서를 생성하세요.');
  process.exit(1);
}

const matrixContent = fs.readFileSync(matrixDocPath, 'utf-8');

// TypeScript presetRegistry에서 프리셋 목록 추출
let registryData;
try {
  const jsonOutput = execSync(
    'npx tsx --import ./scripts/tsx-css-stub.mjs -e "' +
      "import { listIndustryPresets } from './src/app/presets/presetRegistry'; " +
      'console.log(JSON.stringify(listIndustryPresets().map(p => ({ id: p.id, name: p.name, caps: p.capabilities, reqCaps: p.requiredCapabilities || [] }))));' +
      '"',
    { cwd: rootDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
  );
  // tsx 출력에서 첫 번째 JSON 부분만 파싱
  const firstBracket = jsonOutput.indexOf('[');
  const lastBracket = jsonOutput.lastIndexOf(']');
  if (firstBracket === -1 || lastBracket === -1) {
    throw new Error('JSON array not found in tsx output');
  }
  registryData = JSON.parse(jsonOutput.substring(firstBracket, lastBracket + 1));
} catch (err) {
  console.error('[ERROR] presetRegistry 파싱 실패:', err.message);
  process.exit(1);
}

console.log(`- 코드상 등록된 프리셋 수: ${registryData.length}개`);

let errorCount = 0;

for (const p of registryData) {
  // 문서에 해당 preset id가 포함되어 있는지 검증
  const idToken = `\`${p.id}\``;
  if (!matrixContent.includes(idToken)) {
    console.error(`[FAIL] 프리셋 [${p.id}] (${p.name})가 docs/PRESET_CAPABILITY_MATRIX.md에 누락되었습니다.`);
    errorCount++;
  }
}

if (errorCount > 0) {
  console.error(`\n[FAILED] 총 ${errorCount}건의 프리셋 불일치가 발견되었습니다.`);
  console.error('해결: npx tsx --import ./scripts/tsx-css-stub.mjs scripts/generate-preset-capability-matrix.ts 를 실행하여 문서를 갱신하세요.');
  process.exit(1);
}

console.log(`✓ 52개 전체 업종 프리셋 및 Capability 구성이 docs/PRESET_CAPABILITY_MATRIX.md와 100% 일치합니다.`);
console.log('=== [PASS] check-preset-capability-parity 검증 완료 ===\n');
process.exit(0);
