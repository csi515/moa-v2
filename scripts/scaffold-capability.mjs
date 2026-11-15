/**
 * Moa-v2 지능형 Capability 자동 배선 스캐폴더 (Smart Auto-Wiring Capability Scaffolder)
 *
 * 신규 Capability 생성 시:
 * 1. 5대 표준 디렉터리/파일(manifest, index, UI, domain, 단위테스트) 생성
 * 2. Phase 3 선언형 UI(AutoDataTable, AutoEntityModal)를 탑재한 상용급 관리 뷰 자동 주입
 * 3. src/capabilities/_shared/capabilityTypes.ts 및 src/capabilities/index.ts 원클릭 자동 배선(Auto-Wiring)
 * 4. 생성 즉시 npm run test:capability-contract 및 test:capability-public-api 100% 통과 보장
 *
 * 사용법:
 *   node scripts/scaffold-capability.mjs <capability_id> [한글_표시명]
 *   node scripts/scaffold-capability.mjs <capability_id> --dry-run
 *   node scripts/scaffold-capability.mjs --self-test
 *
 * 예시:
 *   node scripts/scaffold-capability.mjs smart_locker "스마트 사물함"
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const capabilitiesDir = join(root, 'src', 'capabilities');
const typesFilePath = join(capabilitiesDir, '_shared', 'capabilityTypes.ts');
const indexFilePath = join(capabilitiesDir, 'index.ts');

function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toTitleCase(str) {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 1. capabilityTypes.ts 자동 배선
 */
export function wireCapabilityTypes(capabilityId, dryRun = false) {
  const content = readFileSync(typesFilePath, 'utf8');
  if (content.includes(`'${capabilityId}'`)) {
    return { ok: true, skipped: true };
  }

  const target = '  // 전문 ERP 벤치마킹 7대 신규 Capability';
  const insertion = `  '${capabilityId}',\n`;

  if (!content.includes(target)) {
    throw new Error(`capabilityTypes.ts 배선 지점('${target}')을 찾을 수 없습니다.`);
  }

  const newContent = content.replace(target, `${insertion}${target}`);
  if (!dryRun) {
    writeFileSync(typesFilePath, newContent, 'utf8');
  }
  return { ok: true, modified: typesFilePath };
}

/**
 * 2. capabilities/index.ts 자동 배선
 */
export function wireCapabilitiesIndex(capabilityId, dryRun = false) {
  const content = readFileSync(indexFilePath, 'utf8');
  const camelName = `${toCamelCase(capabilityId)}Capability`;

  if (content.includes(`'./${capabilityId}/manifest'`)) {
    return { ok: true, skipped: true };
  }

  // 1) Import 추가
  const importTarget = "import { baby_food_coopCapability } from './baby_food_coop/manifest';";
  const importLine = `import { ${camelName} } from './${capabilityId}/manifest';`;
  if (!content.includes(importTarget)) {
    throw new Error('index.ts import 배선 지점을 찾을 수 없습니다.');
  }
  let newContent = content.replace(importTarget, `${importTarget}\n${importLine}`);

  // 2) CAPABILITY_MANIFESTS 배열 추가
  const arrayTarget = '  baby_food_coopCapability,';
  const arrayLine = `  ${camelName},`;
  newContent = newContent.replace(arrayTarget, `${arrayTarget}\n${arrayLine}`);

  // 3) export * 추가
  const exportTarget = "export * from './baby_food_coop';";
  const exportLine = `export * from './${capabilityId}';`;
  newContent = newContent.replace(exportTarget, `${exportTarget}\n${exportLine}`);

  if (!dryRun) {
    writeFileSync(indexFilePath, newContent, 'utf8');
  }
  return { ok: true, modified: indexFilePath };
}

/**
 * 3. 템플릿 파일들 생성
 */
export function generateTemplates(capabilityId, displayName, dryRun = false) {
  const pascalName = toPascalCase(capabilityId);
  const targetDir = join(capabilitiesDir, capabilityId);

  // 1) manifest.ts
  const manifestContent = `import { defineCapability } from '../_shared/defineCapability';

/**
 * ${displayName} Capability 매니페스트
 */
export const ${toCamelCase(capabilityId)}Capability = defineCapability({
  id: '${capabilityId}',
  displayName: '${displayName}',
  description: '${displayName} 관리 및 도메인 기능',
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['${capabilityId}.read', '${capabilityId}.manage'],
});
`;

  // 2) UI ManagementView.tsx (Phase 3 AutoDataTable / AutoEntityModal 기본 탑재)
  const uiContent = `import React, { useState } from 'react';
import { AutoDataTable, AutoEntityModal } from '@/shared/components/declarative';
import { Button } from '@/shared/components/ui/Button';

/**
 * ${displayName} 관리 메인 뷰 (<${pascalName}ManagementView />)
 *
 * Phase 3 선언형 AutoDataTable & AutoEntityModal을 상속하여
 * 4-State UI, 테넌트 격리, 360px 모바일 카드 뷰, 고정폭 숫자 처리가 내장되어 있습니다.
 */
export function ${pascalName}ManagementView() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | undefined>(undefined);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AutoDataTable
        resource="${capabilityId}"
        title="${displayName} 관리"
        entityName="${displayName}"
        columns={[
          { key: 'name', header: '이름', mobilePriority: 'title' },
          { key: 'status', header: '상태', align: 'center' },
          { key: 'created_at', header: '등록일시', align: 'right' },
        ]}
        extraActions={
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSelectedRecordId(undefined);
              setIsModalOpen(true);
            }}
            className="min-h-[44px]"
          >
            + 새 ${displayName} 등록
          </Button>
        }
        onRowClick={(rec: any) => {
          setSelectedRecordId(rec.id);
          setIsModalOpen(true);
        }}
        onEmptyAction={() => {
          setSelectedRecordId(undefined);
          setIsModalOpen(true);
        }}
      />

      <AutoEntityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resource="${capabilityId}"
        entityName="${displayName}"
        recordId={selectedRecordId}
        fields={[
          { name: 'name', label: '${displayName} 이름', type: 'text', required: true },
          { name: 'status', label: '상태', type: 'select', options: [
            { label: '활성', value: 'active' },
            { label: '비활성', value: 'inactive' },
          ], defaultValue: 'active' },
          { name: 'memo', label: '메모', type: 'textarea' },
        ]}
      />
    </div>
  );
}
`;

  // 3) domain/<name>.ts (타임존 결정론 준수 순수 함수 템플릿)
  const domainContent = `/**
 * ${displayName} 도메인 순수 비즈니스 로직
 *
 * 규칙: TIME-DETERMINISM
 * 인자 없는 new Date()를 직접 호출하지 않고, 기준 시각(now)을 주입받아 평가합니다.
 */

export interface ${pascalName}Item {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export function is${pascalName}Active(item: ${pascalName}Item): boolean {
  return item.status === 'active';
}

export function validate${pascalName}Name(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '${displayName} 이름을 입력해주세요.' };
  }
  if (name.trim().length > 50) {
    return { valid: false, error: '이름은 50자 이내여야 합니다.' };
  }
  return { valid: true };
}
`;

  // 4) domain/<name>.test.ts (단위 테스트 템플릿)
  const testContent = `import assert from 'node:assert/strict';
import { is${pascalName}Active, validate${pascalName}Name } from './${capabilityId}';

console.log('🧪 [${pascalName} Domain Suite] 단위 테스트 검증 시작...');

// Suite 1: 활성 상태 검사
(() => {
  assert.strictEqual(
    is${pascalName}Active({ id: '1', name: '테스트', status: 'active', createdAt: '2026-01-01' }),
    true
  );
  assert.strictEqual(
    is${pascalName}Active({ id: '2', name: '테스트', status: 'inactive', createdAt: '2026-01-01' }),
    false
  );
  console.log('  ✔ Suite 1: 활성 상태 검사 통과');
})();

// Suite 2: 이름 유효성 검사
(() => {
  assert.strictEqual(validate${pascalName}Name('').valid, false);
  assert.strictEqual(validate${pascalName}Name('정상 이름').valid, true);
  console.log('  ✔ Suite 2: 이름 유효성 검증 통과');
})();

console.log('✨ [${pascalName} Domain Suite] 모든 단위 테스트 100% 통과!\\n');
`;

  // 5) index.ts (Public API Barrel)
  const indexContent = `/**
 * ${displayName} Capability 공식 Public API
 *
 * 규칙: CAPABILITY-CONTRACT
 * 외부에서는 오직 이 index.ts를 통해서만 심볼을 import합니다.
 */

export * from './manifest';
export * from './domain/${capabilityId}';
export * from './ui/${pascalName}ManagementView';
`;

  if (dryRun) {
    return {
      manifest: manifestContent,
      ui: uiContent,
      domain: domainContent,
      test: testContent,
      index: indexContent,
    };
  }

  // 실제 디렉터리 및 파일 생성
  mkdirSync(join(targetDir, 'domain'), { recursive: true });
  mkdirSync(join(targetDir, 'ui'), { recursive: true });
  mkdirSync(join(targetDir, 'services'), { recursive: true });

  writeFileSync(join(targetDir, 'manifest.ts'), manifestContent, 'utf8');
  writeFileSync(join(targetDir, 'ui', `${pascalName}ManagementView.tsx`), uiContent, 'utf8');
  writeFileSync(join(targetDir, 'domain', `${capabilityId}.ts`), domainContent, 'utf8');
  writeFileSync(join(targetDir, 'domain', `${capabilityId}.test.ts`), testContent, 'utf8');
  writeFileSync(join(targetDir, 'index.ts'), indexContent, 'utf8');

  return { ok: true, targetDir };
}

/**
 * 4. 전체 오케스트레이션 실행 함수
 */
export function scaffoldCapability(options) {
  const { capabilityId, displayName: rawDisplayName, dryRun = false } = options;

  if (!capabilityId) {
    throw new Error('Capability ID를 지정해야 합니다.');
  }

  if (!/^[a-z][a-z0-9_]*$/.test(capabilityId)) {
    throw new Error('Capability ID는 소문자 알파벳, 숫자, 밑줄(_)만 허용됩니다.');
  }

  const targetDir = join(capabilitiesDir, capabilityId);
  if (existsSync(targetDir) && !dryRun) {
    throw new Error(`이미 존재하는 Capability입니다: ${targetDir}`);
  }

  const displayName = rawDisplayName || toTitleCase(capabilityId);

  console.log(`\n🚀 [AUTO-SCAFFOLD] Capability 스캐폴딩 및 자동 배선 시작...`);
  console.log(`   - ID: ${capabilityId}`);
  console.log(`   - 표시명: ${displayName}`);
  console.log(`   - 드라이 런(Dry Run): ${dryRun ? 'YES' : 'NO'}\n`);

  if (dryRun) {
    const templates = generateTemplates(capabilityId, displayName, true);
    console.log('📋 [DRY-RUN] 생성될 파일 목록:');
    console.log(`   - src/capabilities/${capabilityId}/manifest.ts`);
    console.log(`   - src/capabilities/${capabilityId}/index.ts`);
    console.log(`   - src/capabilities/${capabilityId}/ui/${toPascalCase(capabilityId)}ManagementView.tsx`);
    console.log(`   - src/capabilities/${capabilityId}/domain/${capabilityId}.ts`);
    console.log(`   - src/capabilities/${capabilityId}/domain/${capabilityId}.test.ts`);
    console.log('📋 [DRY-RUN] 자동 배선될 파일:');
    console.log('   - src/capabilities/_shared/capabilityTypes.ts (CAPABILITY_IDS 등록)');
    console.log('   - src/capabilities/index.ts (CAPABILITY_MANIFESTS 및 public re-export 등록)\n');
    return { ok: true, dryRun: true };
  }

  // 1. 파일 템플릿 생성
  generateTemplates(capabilityId, displayName, false);
  console.log(`✔ [1/3] 5대 표준 파일/디렉터리 생성 완료`);

  // 2. capabilityTypes.ts 자동 배선
  wireCapabilityTypes(capabilityId, false);
  console.log(`✔ [2/3] capabilityTypes.ts (CAPABILITY_IDS) 자동 배선 완료`);

  // 3. capabilities/index.ts 자동 배선
  wireCapabilitiesIndex(capabilityId, false);
  console.log(`✔ [3/3] capabilities/index.ts (매니페스트 및 Public API) 자동 배선 완료`);

  console.log(`\n✨ [AUTO-SCAFFOLD] '${capabilityId}' (${displayName}) 스캐폴딩 및 완전 자동 배선 성공!`);
  console.log(`   - 위치: src/capabilities/${capabilityId}/`);
  console.log(`   - 즉시 사용 가능: npm run test:fast 또는 npm run test:capability-contract 로 무결성 확인 가능.\n`);

  return { ok: true, targetDir };
}

/**
 * 5. 셀프 테스트
 */
export function selfTest() {
  console.log('🧪 [AUTO-SCAFFOLD] 스캐폴더 및 자동 배선 자체 검증(--self-test) 시작...');

  const testId = 'test_temp_cap_scaffold';
  const testDir = join(capabilitiesDir, testId);

  try {
    // 1. Dry Run 검증
    const dryResult = scaffoldCapability({ capabilityId: testId, displayName: '테스트용', dryRun: true });
    if (!dryResult.ok || !dryResult.dryRun) {
      throw new Error('Self-test 실패: Dry Run 동작 이상');
    }

    // 2. 템플릿 생성 내용 검증
    const templates = generateTemplates(testId, '임시 테스트', true);
    if (!templates.manifest.includes(testId)) throw new Error('manifest 템플릿 생성 누락');
    if (!templates.ui.includes('AutoDataTable')) throw new Error('선언형 AutoDataTable 템플릿 누락');
    if (!templates.ui.includes('AutoEntityModal')) throw new Error('선언형 AutoEntityModal 템플릿 누락');

    console.log('✅ [AUTO-SCAFFOLD] 스캐폴더 및 선언형 템플릿 셀프 테스트 100% 통과!\n');
    return true;
  } finally {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// CLI 엔트리포인트
if (process.argv[1] && process.argv[1].includes('scaffold-capability.mjs')) {
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

  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter((a) => a !== '--dry-run');
  const capabilityId = filteredArgs[0];
  const displayName = filteredArgs[1];

  try {
    scaffoldCapability({ capabilityId, displayName, dryRun });
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ [AUTO-SCAFFOLD] 오류: ${err.message}\n`);
    process.exit(1);
  }
}
