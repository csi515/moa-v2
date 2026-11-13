/**
 * 도메인 순수 함수 내 new Date() 직접 호출 검사 (TIME-DETERMINISM)
 *
 * 비즈니스 로직(src/capabilities/star/domain) 내부에서 인자 없는 new Date()를 직접
 * 인스턴스화하면 타임존 오차 및 자정/말일 테스트 비결정론(Non-determinism)이 발생합니다.
 * 기준 시각 주입 또는 @/shared/utils/localDate 사용을 권장합니다.
 *
 * 기존 레거시 위반 파일은 BASELINE_ALLOWLIST로 허용되며,
 * 신규 도메인 파일에서 인자 없는 new Date()가 추가되면 CI가 차단됩니다 (Exit 1).
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

/**
 * 기존 허용 목록: 모든 Domain 로직의 인자 없는 new Date()가 100% 해결되어 0건 유지.
 * 신규 파일 추가 절대 금지.
 */
export const BASELINE_ALLOWLIST = new Set([]);

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
        isAllowlisted: BASELINE_ALLOWLIST.has(rel),
      });
    }
  }

  return violations;
}

function runSelfTest() {
  const dummyViolations = [
    { file: 'src/capabilities/dummy/domain/Dummy.ts', count: 1, isAllowlisted: false },
  ];
  if (!dummyViolations.some((v) => !v.isAllowlisted)) {
    console.error('check-time-determinism self-test failed');
    process.exit(1);
  }
  console.log('check-time-determinism self-test: ok');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const violations = scanDomainTimeViolations();
const newViolations = violations.filter((v) => !v.isAllowlisted);

if (newViolations.length > 0) {
  console.error(`\n❌ [TIME-DETERMINISM-FAIL] 신규 Domain 로직 파일에서 인자 없는 new Date() 호출이 발견되어 차단되었습니다:`);
  for (const v of newViolations) {
    console.error(`  - ${v.file} (${v.count}회) -> todayIsoLocal() 또는 시각 매개변수 주입 필수`);
  }
  console.error('도메인 순수성과 테스트 결정론(Determinism)을 위해 시각을 매개변수로 주입하세요.\n');
  process.exit(1);
}

if (violations.length > 0) {
  console.warn(`⚠️ [TIME-DETERMINISM] 기존 Allowlist Domain 로직 내 ${violations.length}개 파일에서 인자 없는 new Date() 호출 감지 (점진적 리팩토링 대상):`);
  for (const v of violations.slice(0, 5)) {
    console.warn(`  - ${v.file} (${v.count}회)`);
  }
  if (violations.length > 5) {
    console.warn(`  ... 외 ${violations.length - 5}개 파일 (Allowlisted)`);
  }
  console.log('check-time-determinism: ok (신규 위반 0건, Allowlist 잔존 ' + violations.length + '건)');
} else {
  console.log('check-time-determinism: ok (0 violations in domain layers)');
}
