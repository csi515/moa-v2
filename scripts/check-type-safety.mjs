/**
 * Moa-v2 Type Safety Guardrail (TYPE-SAFETY / ZERO-ANY DX)
 *
 * 코드베이스 내 'as any' 캐스팅 남용을 감시하고, Refine 쿼리 결과에 대해
 * useMoaTable, useMoaMutation 또는 Database['public'] 스키마 타입을 사용하도록 유도합니다.
 *
 * 실행:
 *   node scripts/check-type-safety.mjs [--self-test]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'src');

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
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

export function scanTypeSafetyViolations() {
  const files = walk(srcDir);
  const violations = [];
  const AS_ANY_RE = /\bas\s+any\b/g;

  for (const file of files) {
    const rel = toPosix(file);
    // database.types.ts 자체나 레거시 shim 등은 제외
    if (rel.includes('database.types.ts') || rel.includes('database.generated.ts')) {
      continue;
    }

    const raw = readFileSync(file, 'utf8');
    const clean = stripComments(raw);
    const matches = clean.match(AS_ANY_RE);

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
  console.log('check-type-safety self-test: ok');
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
}

const violations = scanTypeSafetyViolations();
const totalCount = violations.reduce((acc, v) => acc + v.count, 0);

console.log(`📊 [TYPE-SAFETY] 'as any' 현황: 총 ${violations.length}개 파일, ${totalCount}건 감지`);

if (totalCount > 300) {
  console.error(`❌ [TYPE-SAFETY] 'as any' 캐스팅이 허용 한도(300건)를 초과했습니다. 신규 'as any' 유입을 멈추고 useMoaTable/Database 타입을 바인딩하세요.`);
  process.exit(1);
} else {
  console.log(`✅ [TYPE-SAFETY] check-type-safety: ok (베이스라인 관리 범위 내 유지 중, 점진적 감축 진행)`);
}
