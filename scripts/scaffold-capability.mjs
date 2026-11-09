/**
 * Moa-v2 Capability Scaffolder (CAPABILITY-CONTRACT)
 *
 * 신규 Capability 생성 시 필수 계약(Contract) 파일 및 디렉터리 구조를 표준에 맞게 자동 생성합니다.
 *
 * 사용법:
 *   node scripts/scaffold-capability.mjs <capability_id>
 * 예시:
 *   node scripts/scaffold-capability.mjs locker_facility
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const capabilitiesDir = join(root, 'src', 'capabilities');

const capabilityId = process.argv[2]?.trim().toLowerCase();

if (!capabilityId) {
  console.error('오류: Capability ID를 지정해야 합니다.');
  console.error('사용법: node scripts/scaffold-capability.mjs <capability_id>');
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*$/.test(capabilityId)) {
  console.error('오류: Capability ID는 소문자 알파벳, 숫자, 밑줄(_)만 허용됩니다.');
  process.exit(1);
}

const targetDir = join(capabilitiesDir, capabilityId);

if (existsSync(targetDir)) {
  console.error(`오류: 이미 존재하는 Capability 디렉터리입니다: ${targetDir}`);
  process.exit(1);
}

console.log(`🚀 [Capability Scaffolder] '${capabilityId}' Capability 스캐폴딩 시작...\n`);

// 1. 디렉터리 생성
mkdirSync(targetDir, { recursive: true });
mkdirSync(join(targetDir, 'domain'), { recursive: true });
mkdirSync(join(targetDir, 'ui'), { recursive: true });
mkdirSync(join(targetDir, 'services'), { recursive: true });

// 2. manifest.ts 생성
const manifestContent = `import { defineCapability } from '../_shared/defineCapability';

/**
 * ${capabilityId} Capability 매니페스트
 */
export const ${toCamelCase(capabilityId)}Manifest = defineCapability({
  id: '${capabilityId}',
  name: '${toTitleCase(capabilityId)}',
  description: '${toTitleCase(capabilityId)} domain capability',
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['${capabilityId}.read', '${capabilityId}.manage'],
});
`;

writeFileSync(join(targetDir, 'manifest.ts'), manifestContent, 'utf8');

// 3. index.ts 생성 (Public API Barrel)
const indexContent = `/**
 * ${capabilityId} Capability 공식 Public API
 *
 * 외부(Preset 등)에서는 오직 이 index.ts를 통해서만 심볼을 import해야 합니다.
 * (규칙: CAPABILITY-CONTRACT)
 */

export * from './manifest';
`;

writeFileSync(join(targetDir, 'index.ts'), indexContent, 'utf8');

console.log(`✅ 생성 완료:`);
console.log(`  - ${targetDir}/manifest.ts`);
console.log(`  - ${targetDir}/index.ts`);
console.log(`  - ${targetDir}/domain/`);
console.log(`  - ${targetDir}/ui/`);
console.log(`  - ${targetDir}/services/`);
console.log(`\n📌 다음 단계 안내:`);
console.log(`  1. src/capabilities/_shared/capabilityTypes.ts 의 CAPABILITY_IDS 에 '${capabilityId}' 추가`);
console.log(`  2. src/capabilities/capabilityMaturity.ts 에 성숙도 등급 등록`);
console.log(`  3. npm run test:capability-contract 실행하여 계약 검증\n`);

function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function toTitleCase(str) {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
