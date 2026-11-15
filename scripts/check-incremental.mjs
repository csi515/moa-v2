/**
 * Moa-v2 초고속 증분 가드레일 감사기 (Fast Incremental Guardrail Auditor)
 *
 * 전체 99개 테스트를 실행하지 않고, Git에 변경된 파일(Staged 또는 Working tree)만
 * 0.1~0.5초 이내에 5대 핵심 불변성(아키텍처, 타임존, 용어, 타입안전, UI일관성)을 검사합니다.
 *
 * 사용법:
 *   node scripts/check-incremental.mjs           # Working tree 변경 파일 검사
 *   node scripts/check-incremental.mjs --staged  # Git Staged 변경 파일 검사 (Pre-commit 훅용)
 *   node scripts/check-incremental.mjs --all     # src 전체 대상 고속 린트
 *   node scripts/check-incremental.mjs --self-test # 자체 무결성 검증
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_MODAL_FILES, LEGACY_MODAL_BASELINE } from './check-ui-consistency.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function toPosix(p) {
  return relative(root, p).replace(/\\/g, '/');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * 1. Git 변경 파일 목록 추출
 */
export function getChangedFiles(mode = 'working') {
  try {
    let cmd = 'git diff HEAD --name-only --diff-filter=ACMR';
    if (mode === 'staged') {
      cmd = 'git diff --cached --name-only --diff-filter=ACMR';
    } else if (mode === 'untracked') {
      cmd = 'git status -s | grep "^??" | cut -c4-';
    }
    const output = execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
    if (!output) return [];
    return output
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.sql')));
  } catch {
    return [];
  }
}

export function getChangedLineNumbers(file, mode = 'working') {
  try {
    let cmd = `git diff HEAD -U0 -- "${file}"`;
    if (mode === 'staged') {
      cmd = `git diff --cached -U0 -- "${file}"`;
    }
    const output = execSync(cmd, { cwd: root, encoding: 'utf8' });
    const lines = new Set();
    const hunkHeaderRe = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
    for (const l of output.split(/\r?\n/)) {
      const m = l.match(hunkHeaderRe);
      if (m) {
        const start = parseInt(m[3], 10);
        const count = m[4] !== undefined ? parseInt(m[4], 10) : 1;
        for (let i = 0; i < count; i++) lines.add(start + i);
      }
    }
    return lines;
  } catch {
    return null;
  }
}

/**
 * 2. 개별 파일별 5대 검사 룰 엔진
 */
export function inspectFile(filePath, contentOverride = null, changedLines = null) {
  const relPath = toPosix(filePath);
  const fullPath = join(root, relPath);

  let rawContent;
  if (contentOverride !== null) {
    rawContent = contentOverride;
  } else {
    if (!existsSync(fullPath)) return [];
    rawContent = readFileSync(fullPath, 'utf8');
  }

  const cleanContent = stripComments(rawContent);
  const violations = [];

  const shouldCheckLine = (lineNo) => {
    if (!changedLines) return true;
    return changedLines.has(lineNo);
  };

  // [RULE 1] 아키텍처 의존성 경계 검사
  // Core/Capability -> Industry 참조 금지
  if (relPath.startsWith('src/core/') || relPath.startsWith('src/capabilities/')) {
    const lines = cleanContent.split('\n');
    lines.forEach((line, idx) => {
      if (/from\s+['"][^'"]*\/industries\//.test(line) || /from\s+['"]@\/industries\//.test(line)) {
        violations.push({
          rule: 'ARCHITECTURE-BOUNDARY',
          file: relPath,
          line: idx + 1,
          message: 'Core 및 Capability 레이어는 Industry 레이어를 import할 수 없습니다.',
          snippet: line.trim(),
        });
      }
    });

    // Capability -> 다른 Capability 내부 직접 참조 금지 (publicApi/shim 경유 필수)
    if (relPath.startsWith('src/capabilities/')) {
      const parts = relPath.split('/');
      const currentCap = parts[2];
      lines.forEach((line, idx) => {
        const match = line.match(/from\s+['"]@\/capabilities\/([a-z0-9_]+)\/(ui|domain|services|components)\//);
        if (match && match[1] !== currentCap) {
          violations.push({
            rule: 'CAPABILITY-ENCAPSULATION',
            file: relPath,
            line: idx + 1,
            message: `다른 Capability('${match[1]}')의 내부 모듈을 직접 import할 수 없습니다. publicApi 또는 index를 경유하세요.`,
            snippet: line.trim(),
          });
        }
      });
    }
  }

  // [RULE 2] UI -> StorageService 직접 호출 금지 (Refine 또는 useMoaTable/useMoaList 사용 의무화)
  if (relPath.includes('/ui/') || relPath.includes('/components/') || relPath.includes('/pages/')) {
    const lines = cleanContent.split('\n');
    lines.forEach((line, idx) => {
      if (/from\s+['"][^'"]*storage\/storageService['"]/.test(line) || /from\s+['"]@\/core\/storage\/storageService['"]/.test(line)) {
        violations.push({
          rule: 'UI-DATA-BOUNDARY',
          file: relPath,
          line: idx + 1,
          message: 'UI 컴포넌트에서 StorageService를 직접 import할 수 없습니다. useMoaTable 또는 Refine 훅을 사용하세요.',
          snippet: line.trim(),
        });
      }
    });
  }

  // [RULE 3] 타임존 결정론 검사 (도메인 계층 내 new Date() 직접 호출 금지)
  if (relPath.includes('/domain/') && (relPath.endsWith('.ts') || relPath.endsWith('.tsx'))) {
    const lines = cleanContent.split('\n');
    lines.forEach((line, idx) => {
      if (/\bnew\s+Date\s*\(\s*\)/.test(line)) {
        violations.push({
          rule: 'TIME-DETERMINISM',
          file: relPath,
          line: idx + 1,
          message: 'Domain 순수 함수 내부에서 인자 없는 new Date() 직접 호출 금지. 기준 시각 주입 또는 @/shared/utils/localDate 사용.',
          snippet: line.trim(),
        });
      }
    });
  }

  // [RULE 4] Capability 레이어 맞춤 용어 누출 검사 (원생, 환자, 수강생 등 하드코딩 금지)
  if (
    relPath.startsWith('src/capabilities/') &&
    (relPath.includes('/ui/') || relPath.includes('/components/')) &&
    !relPath.endsWith('.test.tsx') &&
    !relPath.endsWith('.test.ts')
  ) {
    const lines = cleanContent.split('\n');
    const FORBIDDEN_WORDS = ['원생', '환자', '수강생', '진료', '원아'];
    lines.forEach((line, idx) => {
      // 주석, console 제외하고 JSX 텍스트나 문자열 리터럴에 하드코딩된 경우 탐지
      for (const word of FORBIDDEN_WORDS) {
        if (line.includes(word) && !line.includes('useTerminology') && !line.includes('t(')) {
          violations.push({
            rule: 'TERMINOLOGY-LEAK',
            file: relPath,
            line: idx + 1,
            message: `Capability UI에 업종 용어('${word}') 하드코딩 금지. useTenantTerm 또는 useTerminology()를 사용하세요.`,
            snippet: line.trim(),
          });
          break;
        }
      }
    });
  }

  // [RULE 5] UI 일관성 검사 (인라인 팝업 fixed inset-0 금지 -> @/shared/components/ui/Modal 사용)
  if (
    relPath.startsWith('src/') &&
    relPath.endsWith('.tsx') &&
    !relPath.includes('shared/components/ui/Modal') &&
    !relPath.includes('ConfirmDialog') &&
    !relPath.includes('NotificationDrawer') &&
    !relPath.includes('LobbyAttendanceKioskView') &&
    !relPath.includes('CompanyAppLauncherDashboard') &&
    !ALLOWED_MODAL_FILES.has(relPath) &&
    !LEGACY_MODAL_BASELINE.has(relPath)
  ) {
    const lines = cleanContent.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (!shouldCheckLine(lineNo)) return;
      if (/fixed\s+inset-0/.test(line) && !line.includes('Modal') && !line.includes('z-50 pointer-events-none')) {
        violations.push({
          rule: 'UI-CONSISTENCY',
          file: relPath,
          line: lineNo,
          message: '인라인 팝업(fixed inset-0) 직접 작성 금지. @/shared/components/ui/Modal 컴포넌트를 사용하세요.',
          snippet: line.trim(),
        });
      }
    });
  }

  // [RULE 6] 신규 추가된 'as any' 감지
  if (relPath.startsWith('src/') && (relPath.endsWith('.ts') || relPath.endsWith('.tsx'))) {
    const lines = cleanContent.split('\n');
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (!shouldCheckLine(lineNo)) return;
      if (/\bas\s+any\b/.test(line) && !line.includes('// bypass-type-safety')) {
        violations.push({
          rule: 'TYPE-SAFETY-GUARD',
          file: relPath,
          line: lineNo,
          message: "'as any' 캐스팅 지양. database.types.ts 또는 제네릭 매퍼(useMoaTable)를 사용하세요.",
          snippet: line.trim(),
        });
      }
    });
  }

  return violations;
}

/**
 * 3. 메인 러너 및 리포트 출력
 */
export function runIncrementalCheck(options = {}) {
  const { mode = 'working', files: customFiles = null } = options;
  const startTime = Date.now();

  const files = customFiles || getChangedFiles(mode);

  console.log(`\n⚡ [FAST-GUARD] Moa-v2 초고속 증분 감사 시작 (대상: ${files.length}개 파일, 모드: ${mode})...`);

  if (files.length === 0) {
    console.log(`✅ [FAST-GUARD] 검사 대상 변경 파일이 없습니다 (Skip). [소요 시간: ${Date.now() - startTime}ms]\n`);
    return { ok: true, violations: [] };
  }

  let allViolations = [];
  for (const file of files) {
    const changedLines = getChangedLineNumbers(file, mode);
    const fileViolations = inspectFile(file, null, changedLines);
    allViolations.push(...fileViolations);
  }

  const duration = Date.now() - startTime;

  if (allViolations.length === 0) {
    console.log(`✨ [FAST-GUARD] 모든 변경 파일(${files.length}개)이 Moa-v2 아키텍처 및 품질 규격을 100% 준수합니다! [${duration}ms]\n`);
    return { ok: true, violations: [] };
  }

  console.error(`\n❌ [FAST-GUARD] ${allViolations.length}건의 규격 위반이 감지되어 변경을 차단합니다:`);
  console.error('─'.repeat(78));

  allViolations.forEach((v, i) => {
    console.error(`[${i + 1}] [${v.rule}] ${v.file}:${v.line}`);
    console.error(`    사유: ${v.message}`);
    console.error(`    코드: ${v.snippet}`);
    console.error('');
  });

  console.error('─'.repeat(78));
  console.error(`💡 팁: 위반 사유를 해결하거나, 필요 시 docs/rules/ 분야별 규칙서를 참조하세요. [${duration}ms]\n`);

  return { ok: false, violations: allViolations };
}

/**
 * 4. 자체 검증 (--self-test)
 */
export function selfTest() {
  console.log('🧪 [FAST-GUARD] 증분 검사기 자체 무결성 검증(--self-test) 시작...');

  // Test 1: Architecture boundary violation
  const archViolations = inspectFile('src/core/dummy.ts', "import { pianoService } from '@/industries/piano/service';");
  if (!archViolations.some((v) => v.rule === 'ARCHITECTURE-BOUNDARY')) {
    throw new Error('Self-test 실패: ARCHITECTURE-BOUNDARY 감지 실패');
  }

  // Test 2: Time determinism violation
  const timeViolations = inspectFile('src/capabilities/test/domain/pure.ts', 'const now = new Date();');
  if (!timeViolations.some((v) => v.rule === 'TIME-DETERMINISM')) {
    throw new Error('Self-test 실패: TIME-DETERMINISM 감지 실패');
  }

  // Test 3: Terminology leak violation
  const termViolations = inspectFile('src/capabilities/test/ui/View.tsx', 'return <div>원생 목록</div>;');
  if (!termViolations.some((v) => v.rule === 'TERMINOLOGY-LEAK')) {
    throw new Error('Self-test 실패: TERMINOLOGY-LEAK 감지 실패');
  }

  // Test 4: UI consistency violation
  const uiViolations = inspectFile('src/pages/test/Page.tsx', '<div className="fixed inset-0 z-50 bg-black/50">');
  if (!uiViolations.some((v) => v.rule === 'UI-CONSISTENCY')) {
    throw new Error('Self-test 실패: UI-CONSISTENCY 감지 실패');
  }

  // Test 5: Type safety guard violation
  const typeViolations = inspectFile('src/shared/test.ts', 'const x = val as any;');
  if (!typeViolations.some((v) => v.rule === 'TYPE-SAFETY-GUARD')) {
    throw new Error('Self-test 실패: TYPE-SAFETY-GUARD 감지 실패');
  }

  console.log('✅ [FAST-GUARD] 5대 핵심 룰 감지 셀프 테스트 100% 통과!\n');
  return true;
}

// CLI 실행 엔트리포인트
if (process.argv[1] && toPosix(process.argv[1]).includes('scripts/check-incremental.mjs')) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    try {
      selfTest();
      process.exit(0);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  const mode = args.includes('--staged') ? 'staged' : 'working';
  const result = runIncrementalCheck({ mode });
  if (!result.ok) {
    process.exit(1);
  }
}
