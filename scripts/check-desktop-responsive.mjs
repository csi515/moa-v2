/**
 * 데스크톱 반응형 레이아웃 정적 감사기 (DESKTOP-RESPONSIVE-GUARD)
 *
 * 1400px~1920px 등 대화면 데스크톱 모니터에서
 * 모바일 화면을 그대로 좌우로 늘려 출력하는 안티패턴을 방지하고
 * DESKTOP_CONTAINERS 및 max-w-* 제약이 정상 적용되어 있는지 전수 검사합니다.
 *
 * 실행: node scripts/check-desktop-responsive.mjs [--self-test]
 */

import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
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
    if (/\.(tsx|jsx)$/.test(entry.name) && !/\.test\.(tsx|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * 컨테이너 너비 제약 토큰 및 프리미티브
 */
const CONTAINER_CONSTRAINTS = [
  'DESKTOP_CONTAINERS',
  'MasterDetailLayout',
  'max-w-',
  'StandardListView',
  'AutoDataTable',
];

/**
 * 화면 단위 최상위 뷰/페이지인지 판정
 */
function isViewOrPage(filePath) {
  const base = basename(filePath);
  return (
    (base.endsWith('View.tsx') || base.endsWith('Page.tsx') || base.endsWith('Hub.tsx')) &&
    !base.includes('Modal') &&
    !base.includes('Drawer') &&
    !base.includes('Sheet') &&
    !base.includes('Row') &&
    !base.includes('Item') &&
    !base.includes('Tab') &&
    !base.includes('Card') &&
    !base.includes('Picker') &&
    !base.includes('Section') &&
    !base.includes('Skeleton')
  );
}

/**
 * 점진적 감축을 위한 레거시 미적용 화면 베이스라인 로드
 */
const baselineFile = join(here, 'legacy-desktop-baseline.json');
export const LEGACY_DESKTOP_BASELINE = new Set(
  existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')) : []
);

export function scanDesktopResponsiveViolations() {
  const violations = [];
  const files = walk(srcDir);

  for (const file of files) {
    const rel = toPosix(file);
    const isProbe = rel.includes('_desktop_responsive_probe.tmp.tsx');

    // 뷰/페이지 파일 또는 테스트 프로브인 경우만 감사 대상
    if (!isViewOrPage(file) && !isProbe) {
      continue;
    }

    // 기존 레거시 베이스라인 화면은 제외 (신규/수정 시 회귀 차단)
    if (LEGACY_DESKTOP_BASELINE.has(rel) && !isProbe) {
      continue;
    }

    const source = stripComments(readFileSync(file, 'utf8'));
    const hasConstraint = CONTAINER_CONSTRAINTS.some((c) => source.includes(c));

    if (!hasConstraint) {
      violations.push({
        file: rel,
        type: 'missing_desktop_container',
        message:
          '데스크톱 반응형 컨테이너 규격(DESKTOP_CONTAINERS 또는 max-w-*)이 누락되었습니다. ' +
          '대화면에서 모바일 뷰가 가로로 늘어나는 현상을 방지하기 위해 컨테이너 너비를 제한하세요.',
      });
    }
  }

  return violations;
}

export function runSelfTest() {
  console.log('Running check-desktop-responsive self-test...');
  const probeFile = join(srcDir, 'shared', '_desktop_responsive_probe.tmp.tsx');

  try {
    writeFileSync(
      probeFile,
      'export const BadWideView = () => (<div className="w-full space-y-4">bad wide view</div>);',
      'utf8'
    );

    const violations = scanDesktopResponsiveViolations();
    const probeHit = violations.some((v) => v.file.includes('_desktop_responsive_probe.tmp.tsx'));

    if (!probeHit) {
      throw new Error('check-desktop-responsive: self-test probe violation not detected.');
    }
    console.log('Self-test: unconstrained desktop view probe successfully caught ok');
  } finally {
    if (existsSync(probeFile)) {
      unlinkSync(probeFile);
    }
  }

  const cleanViolations = scanDesktopResponsiveViolations();
  const leftoverHit = cleanViolations.some((v) => v.file.includes('_desktop_responsive_probe.tmp.tsx'));
  if (leftoverHit) {
    throw new Error('check-desktop-responsive: probe cleanup failed.');
  }
  console.log('check-desktop-responsive: self-test ok');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else {
  const violations = scanDesktopResponsiveViolations();
  if (violations.length > 0) {
    console.error('\n❌ [DESKTOP-RESPONSIVE-GUARD] 데스크톱 반응형 레이아웃 위반이 감지되었습니다:');
    for (const v of violations) {
      console.error('  - [' + v.type + '] ' + v.file);
      console.error('    ' + v.message);
    }
    console.error('\n대화면 최적화를 위해 @/shared/styles/density의 DESKTOP_CONTAINERS 토큰을 적용하세요.\n');
    process.exit(1);
  }
  console.log('check-desktop-responsive: ok (전수 검사 및 베이스라인 통과)');
}
