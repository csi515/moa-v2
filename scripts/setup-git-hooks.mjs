/**
 * Moa-v2 초경량 Git Pre-commit 훅 설치기 (Zero-Dependency Hook Setup)
 *
 * 외부 무거운 패키지(husky 등) 없이 순수 Git 훅 디렉토리(.git/hooks/pre-commit)에
 * 초고속 증분 감사기(check-incremental.mjs --staged)를 1초 만에 설치/해제합니다.
 *
 * 실행:
 *   node scripts/setup-git-hooks.mjs          # 훅 설치
 *   node scripts/setup-git-hooks.mjs --remove # 훅 제거
 */

import { existsSync, chmodSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const hookPath = join(root, '.git', 'hooks', 'pre-commit');

const HOOK_MARKER = '# MOA_V2_FAST_GUARD_PRE_COMMIT';

const HOOK_SCRIPT = `#!/bin/sh
${HOOK_MARKER}
# Moa-v2 Fast Incremental Pre-Commit Guard
# 커밋 시 변경(staged)된 파일만 0.2초 만에 검사하여 아키텍처/품질 위반을 차단합니다.

echo "⚡ [PRE-COMMIT] Moa-v2 초고속 증분 가드레일 실행 중..."
node scripts/check-incremental.mjs --staged
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ [PRE-COMMIT] 품질 검사를 통과하지 못하여 커밋이 취소되었습니다."
  echo "   위반 내용을 수정한 후 다시 커밋하세요."
  exit 1
fi

exit 0
`;

export function setupHooks(action = 'install') {
  if (!existsSync(join(root, '.git'))) {
    console.warn('⚠️ .git 디렉토리를 찾을 수 없습니다 (Git 저장소 아님).');
    return false;
  }

  if (action === 'remove') {
    if (existsSync(hookPath)) {
      const existing = readFileSync(hookPath, 'utf8');
      if (existing.includes(HOOK_MARKER)) {
        unlinkSync(hookPath);
        console.log('🗑️ [HOOK-SETUP] Moa-v2 pre-commit 훅이 성공적으로 제거되었습니다.');
        return true;
      }
    }
    console.log('ℹ️ [HOOK-SETUP] 제거할 Moa-v2 pre-commit 훅이 존재하지 않습니다.');
    return true;
  }

  // Install mode
  writeFileSync(hookPath, HOOK_SCRIPT, { encoding: 'utf8', mode: 0o755 });
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // Windows chmod 무시
  }

  console.log('✨ [HOOK-SETUP] Moa-v2 초경량 Git pre-commit 훅이 성공적으로 설치되었습니다!');
  console.log(`   위치: ${hookPath}`);
  console.log('   효과: git commit 실행 시 0.2초 만에 Staged 파일 대상 아키텍처/품질 감사 수행.');
  return true;
}

if (process.argv[1] && process.argv[1].includes('setup-git-hooks.mjs')) {
  const isRemove = process.argv.includes('--remove');
  setupHooks(isRemove ? 'remove' : 'install');
}
