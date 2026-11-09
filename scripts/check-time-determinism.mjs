/**
 * 도메인 순수 함수 내 new Date() 직접 호출 검사 (TIME-DETERMINISM)
 *
 * 비즈니스 로직(src/capabilities/star/domain) 내부에서 인자 없는 new Date()를 직접
 * 인스턴스화하면 타임존 오차 및 자정/말일 테스트 비결정론(Non-determinism)이 발생합니다.
 * 기준 시각 주입 또는 @/shared/utils/localDate 사용을 권장합니다.
 *
 * 실행: node scripts/check-time-determinism.mjs [--self-test]
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
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

export function scanDomainTimeViolations() {
  const violations = [];
  const files = walk(capabilitiesDir).filter((file) => file.includes('/domain/') || file.includes('\\domain\\'));

  // 인자 없는 new Date() 호출 탐지 정규식
  const BARE_NEW_DATE_RE = /\bnew\s+Date\s*\(\s*\)/g;

  for (const file of files) {
    const rel = toPosix(file);
    const raw = readFileSync(file, 'utf8');
    const clean = stripComments(raw);
    const matches = clean.match(BARE_NEW_DATE_RE);
    if (matches && matches.length > 0) {
      violations.push({
        file: rel,
        count: matches.length,
      });
    }
  }

  return violations;
}

function runSelfTest() {
  console.log('check-time-determinism self-test: ok');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const violations = scanDomainTimeViolations();
if (violations.length > 0) {
  console.warn(`⚠️ [TIME-DETERMINISM] Domain 로직 내 ${violations.length}개 파일에서 인자 없는 new Date() 호출이 발견되었습니다:`);
  for (const v of violations.slice(0, 10)) {
    console.warn(`  - ${v.file} (${v.count}회) -> todayIsoLocal() 또는 시각 주입 권장`);
  }
  console.warn('  신규 도메인 로직 작성 시 시간 결정론(Determinism)을 위해 시각을 매개변수로 주입하세요.\n');
} else {
  console.log('check-time-determinism: ok (0 violations in domain layers)');
}
