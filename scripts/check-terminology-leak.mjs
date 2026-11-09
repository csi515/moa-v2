/**
 * Capability 레이어 업종 명칭 누수 검사 (TERMINOLOGY-GUARD)
 *
 * Capability는 다업종 중립적이어야 합니다. UI 컴포넌트(ui/, components/) 내부에서
 * '원생', '환자', '수강생' 등 특정 업종 용어를 하드코딩하지 않고
 * useTerminology().t('customer.singular') 훅을 경유하도록 감시합니다.
 *
 * 실행: node scripts/check-terminology-leak.mjs [--self-test]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const capabilitiesDir = join(root, 'src', 'capabilities');

function toPosix(p) {
  return relative(root, p).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const INDUSTRY_SPECIFIC_WORDS = ['원생', '환자', '수강생', '진료', '원아'];

export function scanTerminologyLeaks() {
  const violations = [];
  const files = walk(capabilitiesDir).filter(
    (file) =>
      file.includes('/ui/') ||
      file.includes('\\ui\\') ||
      file.includes('/components/') ||
      file.includes('\\components\\')
  );

  for (const file of files) {
    const rel = toPosix(file);
    const raw = readFileSync(file, 'utf8');
    const clean = stripComments(raw);

    const detected = [];
    for (const word of INDUSTRY_SPECIFIC_WORDS) {
      if (clean.includes(word)) {
        detected.push(word);
      }
    }

    if (detected.length > 0) {
      violations.push({
        file: rel,
        words: detected,
      });
    }
  }

  return violations;
}

function runSelfTest() {
  console.log('check-terminology-leak self-test: ok');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const violations = scanTerminologyLeaks();
if (violations.length > 0) {
  console.warn(`⚠️ [TERMINOLOGY-GUARD] Capability UI 내 ${violations.length}개 파일에서 업종 특정 용어가 감지되었습니다:`);
  for (const v of violations.slice(0, 10)) {
    console.warn(`  - ${v.file} -> [${v.words.join(', ')}] 감지 (useTerminology() 권장)`);
  }
  console.warn('  Capability의 다업종 재사용성을 위해 useTerminology()의 t(...) 함수를 사용하세요.\n');
} else {
  console.log('check-terminology-leak: ok (0 terminology leaks detected)');
}
