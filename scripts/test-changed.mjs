/**
 * Moa-v2 지능형 타겟 테스트 러너 (Smart Changed-Test Runner)
 *
 * 전체 99개 테스트를 매번 실행할 필요 없이,
 * 변경된 파일과 직접 연관된 단위/도메인 테스트만 자동으로 감지하여 1~3초 내에 고속 실행합니다.
 *
 * 사용법:
 *   node scripts/test-changed.mjs           # Working tree 변경 기반 테스트
 *   node scripts/test-changed.mjs --staged  # Git staged 변경 기반 테스트
 *   node scripts/test-changed.mjs --self-test # 러너 자체 무결성 검증
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function toPosix(p) {
  return relative(root, p).replace(/\\/g, '/');
}

/**
 * 1. Git 변경 파일 목록 추출
 */
export function getChangedFiles(mode = 'working') {
  try {
    let cmd = 'git diff HEAD --name-only --diff-filter=ACMR';
    if (mode === 'staged') {
      cmd = 'git diff --cached --name-only --diff-filter=ACMR';
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

/**
 * 2. 디렉토리 내 테스트 파일 검색
 */
function findTestsInDir(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findTestsInDir(full, out);
      continue;
    }
    if (/\.test\.(ts|tsx|mjs)$/.test(entry.name)) {
      out.push(toPosix(full));
    }
  }
  return out;
}

/**
 * 3. 변경 파일 목록에서 연관 테스트 매핑 추출
 */
export function resolveTargetedTests(changedFiles) {
  const targeted = new Set();

  for (const rawFile of changedFiles) {
    const file = toPosix(rawFile);

    // 1) 변경 파일 자체가 테스트 파일인 경우 직접 추가
    if (/\.test\.(ts|tsx|mjs)$/.test(file)) {
      targeted.add(file);
      continue;
    }

    // 2) Capability 레이어 변경 시 해당 Capability 내부 테스트 검색
    if (file.startsWith('src/capabilities/')) {
      const parts = file.split('/');
      const capDir = join(root, 'src', 'capabilities', parts[2]);
      const tests = findTestsInDir(capDir);
      tests.forEach((t) => targeted.add(t));
    }

    // 3) Industry 레이어 변경 시 해당 Industry 내부 테스트 검색
    if (file.startsWith('src/industries/')) {
      const parts = file.split('/');
      const indDir = join(root, 'src', 'industries', parts[2]);
      const tests = findTestsInDir(indDir);
      tests.forEach((t) => targeted.add(t));
    }

    // 4) Core 모듈별 특화 매핑
    if (file.startsWith('src/core/schedules/')) {
      targeted.add('src/core/schedules/sessionPassBookingRules.test.ts');
      targeted.add('src/core/schedules/bookingPassAtomic.test.ts');
    } else if (file.startsWith('src/core/storage/')) {
      targeted.add('src/core/storage/persistencePolicy.test.ts');
    } else if (file.startsWith('src/core/auth/')) {
      targeted.add('src/core/auth/navUtils.test.ts');
      targeted.add('src/core/auth/journeyStates.test.ts');
    } else if (file.startsWith('src/core/domain/')) {
      targeted.add('src/core/domain/stateMachine.test.ts');
    } else if (file.startsWith('src/core/organizations/')) {
      targeted.add('scripts/sessionPassOrgIntegrity.test.ts');
    }

    // 5) Shared 데이터 훅 및 에러 파서 매핑
    if (file.startsWith('src/shared/hooks/data/')) {
      targeted.add('src/shared/hooks/data/useMoaData.test.ts');
    } else if (file.startsWith('src/shared/errors/')) {
      targeted.add('src/shared/errors/supabaseErrorParser.test.ts');
    } else if (file.startsWith('src/shared/components/ui/StandardListView')) {
      targeted.add('src/shared/components/ui/StandardListView.test.ts');
    }
  }

  // 매칭된 테스트가 없으면 기본 회귀 방지 대표 테스트 실행
  if (targeted.size === 0) {
    targeted.add('src/shared/hooks/data/useMoaData.test.ts');
    targeted.add('src/core/auth/navUtils.test.ts');
  }

  return Array.from(targeted);
}

/**
 * 4. 테스트 실행 러너
 */
export function runTargetedTests(options = {}) {
  const { mode = 'working', files: customFiles = null } = options;
  const changedFiles = customFiles || getChangedFiles(mode);

  console.log(`\n🎯 [FAST-TEST] Moa-v2 지능형 타겟 테스트 시작 (변경 감지: ${changedFiles.length}개 파일)...`);

  const testsToRun = resolveTargetedTests(changedFiles);

  console.log(`📋 [FAST-TEST] 실행 대상 테스트: ${testsToRun.length}개 스크립트`);
  testsToRun.forEach((t) => console.log(`   - ${t}`));
  console.log('');

  const startTime = Date.now();
  let failed = 0;

  for (const testPath of testsToRun) {
    const full = join(root, testPath);
    if (!existsSync(full)) {
      console.warn(`⚠️ [FAST-TEST] 테스트 파일 미발견 (건너뜀): ${testPath}`);
      continue;
    }

    console.log(`▶ [RUN] tsx ${testPath}`);
    try {
      execSync(`npx tsx "${full}"`, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
      });
      console.log(`✔ [PASS] ${testPath}\n`);
    } catch {
      console.error(`❌ [FAIL] ${testPath}\n`);
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (failed === 0) {
    console.log(`✨ [FAST-TEST] 모든 타겟 테스트(${testsToRun.length}개) 통과 완료! [${duration}초]\n`);
    return { ok: true, total: testsToRun.length, failed: 0 };
  } else {
    console.error(`❌ [FAST-TEST] ${failed}개 테스트 실패 [${duration}초]\n`);
    return { ok: false, total: testsToRun.length, failed };
  }
}

/**
 * 5. 셀프 테스트
 */
export function selfTest() {
  console.log('🧪 [FAST-TEST] 지능형 타겟 테스트 러너 자체 검증(--self-test) 시작...');

  const scheduleTests = resolveTargetedTests(['src/core/schedules/bookingWritePath.ts']);
  if (!scheduleTests.includes('src/core/schedules/sessionPassBookingRules.test.ts')) {
    throw new Error('Self-test 실패: Schedule 매핑 테스트 누락');
  }

  const dataHookTests = resolveTargetedTests(['src/shared/hooks/data/useMoaTable.ts']);
  if (!dataHookTests.includes('src/shared/hooks/data/useMoaData.test.ts')) {
    throw new Error('Self-test 실패: Data Hooks 매핑 테스트 누락');
  }

  console.log('✅ [FAST-TEST] 타겟 테스트 매핑 셀프 테스트 100% 통과!\n');
  return true;
}

// CLI 실행 엔트리포인트
if (process.argv[1] && toPosix(process.argv[1]).includes('scripts/test-changed.mjs')) {
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
  const result = runTargetedTests({ mode });
  if (!result.ok) {
    process.exit(1);
  }
}
