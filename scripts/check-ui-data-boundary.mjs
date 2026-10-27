// UI 레이어 직접 DB 접근 차단 아키텍처 규칙 검사 (TEST-001)
//
// 규칙:
// - UI 계층 (src/pages, src/capabilities/*/ui, src/capabilities/*/components,
//   src/industries/*/views, src/industries/*/components, src/modules/*/views)
//   에서는 Supabase DB 테이블에 직접 .from() 호출을 금지한다.
// - 데이터 접근은 Refine DataProvider (useList, useCreate 등) 또는
//   Capability/Core 서비스 계층 함수 (*Service.ts)를 경유해야 한다.
//
// 실행: node scripts/check-ui-data-boundary.mjs [--self-test]

import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcRoot = join(root, 'src');

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
    if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isTestFile(filePath) {
  return /\.test\.(ts|tsx)$/.test(filePath) || /\.spec\.(ts|tsx)$/.test(filePath);
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** UI 레이어 파일 판별 */
export function isUiLayerFile(rel) {
  if (isTestFile(rel)) return false;
  if (rel.startsWith('src/pages/')) return true;
  if (
    rel.startsWith('src/capabilities/') &&
    (rel.includes('/ui/') || rel.includes('/components/'))
  ) {
    return true;
  }
  if (
    rel.startsWith('src/industries/') &&
    (rel.includes('/views/') || rel.includes('/components/'))
  ) {
    return true;
  }
  if (
    rel.startsWith('src/modules/') &&
    (rel.includes('/views/') || rel.includes('/components/'))
  ) {
    return true;
  }
  return false;
}

/**
 * UI 파일에서 직접 DB .from(...) 호출을 탐지하는 정규식.
 * 예:
 * - getCoreClient().from(...)
 * - supabase.from(...)
 * - client.from(...)
 */
const DIRECT_DB_FROM_RE = /(?:getCoreClient\s*\([^)]*\)|supabase|client)\s*(?:\.\s*from\s*\(|\s+as\s+[^)]+\)\s*\.\s*from\s*\()/;

export function scanUiFileForDirectDb(filePath) {
  const rel = toPosix(filePath);
  if (!isUiLayerFile(rel)) return null;

  const rawSource = readFileSync(filePath, 'utf8');
  const cleanSource = stripComments(rawSource);

  // getCoreClient 또는 supabase import 여부 확인
  const importsDbClient =
    /from\s+['"][^'"]*\/supabase(?:['"]|\/)/.test(rawSource) ||
    /getCoreClient/.test(cleanSource) ||
    /supabase/.test(cleanSource);

  if (!importsDbClient) {
    return null;
  }

  const match = DIRECT_DB_FROM_RE.exec(cleanSource);
  if (match) {
    return {
      file: rel,
      pattern: match[0],
      message: `UI 계층 파일에서 Supabase DB 직접 테이블 쿼리(${match[0]})가 탐지되었습니다. Capability/Core의 서비스 계층 함수(*Service.ts) 또는 Refine DataProvider를 사용하세요.`,
    };
  }

  return null;
}

export function collectUiDirectDbViolations() {
  const allFiles = [
    ...walk(join(srcRoot, 'pages')),
    ...walk(join(srcRoot, 'capabilities')),
    ...walk(join(srcRoot, 'industries')),
    ...walk(join(srcRoot, 'modules')),
  ];

  const violations = [];
  for (const file of allFiles) {
    const v = scanUiFileForDirectDb(file);
    if (v) violations.push(v);
  }
  return violations;
}

function selfTest() {
  console.log('Running check-ui-data-boundary self-test...');
  const probeFile = join(srcRoot, 'pages', '__probe_test_db_boundary__.tsx');
  try {
    writeFileSync(
      probeFile,
      `import { getCoreClient } from '@/lib/supabase';
export function ProbePage() {
  const data = (getCoreClient() as any).from('test_table').select('*');
  return null;
}`,
      'utf8'
    );

    const hit = scanUiFileForDirectDb(probeFile);
    if (!hit) {
      throw new Error('Self-test failed: probe getCoreClient().from() violation was NOT detected!');
    }
    console.log('Self-test: probe violation successfully caught ok');
  } finally {
    if (existsSync(probeFile)) {
      unlinkSync(probeFile);
    }
  }

  const cleanViolations = collectUiDirectDbViolations();
  if (cleanViolations.length > 0) {
    throw new Error(
      `Clean state check failed with violations: ${cleanViolations.map((v) => v.file).join(', ')}`
    );
  }
  console.log('Self-test: clean state verification ok');
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--self-test')) {
    try {
      selfTest();
      console.log('check-ui-data-boundary: self-test ok');
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
    return;
  }

  const violations = collectUiDirectDbViolations();
  if (violations.length > 0) {
    console.error('\nUI 레이어 직접 DB 접근 위반이 발견되었습니다:');
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.message}`);
    }
    process.exit(1);
  }

  console.log('check-ui-data-boundary: ok (0 violations)');
}

main();
