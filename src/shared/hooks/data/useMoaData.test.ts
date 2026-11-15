/**
 * Moa Data Hooks Integration Unit Tests (PHASE 1 DX VERIFICATION)
 * 실행: npx tsx src/shared/hooks/data/useMoaData.test.ts
 */

import assert from 'node:assert/strict';
import { isTenantScopedResource, getTenantColumnForResource } from '@/providers/dataProvider';
import { RESOURCE_TO_STORAGE_KEY_MAP } from '@/core/query/crossCacheBridge';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';

async function runMoaDataHooksSuite() {
  console.log('🧪 [useMoaData Hooks Suite] Phase 1 데이터 훅 계약 및 통합 무결성 검증 시작...\n');

  // 1. 테넌트 스코프 리소스 매핑 및 컬럼 일관성 검증
  {
    assert.equal(isTenantScopedResource('customers'), true, 'customers는 테넌트 격리 대상이어야 함');
    assert.equal(isTenantScopedResource('lockers'), true, 'lockers는 테넌트 격리 대상이어야 함');
    assert.equal(isTenantScopedResource('schedules'), true, 'schedules는 테넌트 격리 대상이어야 함');
    assert.equal(getTenantColumnForResource('customers'), 'organization_id');
    assert.equal(getTenantColumnForResource('lockers'), 'tenant_id');
    console.log('  ✔ Suite 1: 테넌트 격리 리소스 및 컬럼 매핑 검증 완료');
  }

  // 2. Cross-Cache Bridge 리소스 맵 무결성 검증
  {
    assert.ok(RESOURCE_TO_STORAGE_KEY_MAP.customers, 'customers 리소스가 StorageKey와 연결되어야 함');
    assert.ok(RESOURCE_TO_STORAGE_KEY_MAP.lockers, 'lockers 리소스가 StorageKey와 연결되어야 함');
    assert.ok(RESOURCE_TO_STORAGE_KEY_MAP.schedules, 'schedules 리소스가 StorageKey와 연결되어야 함');
    console.log('  ✔ Suite 2: Cross-Cache Bridge 스토리지 키 매핑 확인 완료');
  }

  // 3. RLS 에러 캡처 및 정규화 메시지 변환 검증
  {
    const rlsError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "lockers"',
    };
    const parsed = parseSupabaseError(rlsError, { entity: '사물함', action: '배정' });
    assert.equal(parsed.code, 'PERMISSION_DENIED');
    assert.match(parsed.userMessage, /사물함 배정 권한이 없습니다/);
    console.log('  ✔ Suite 3: useMoaMutation 에러 정규화 연동 검증 완료');
  }

  // 4. 모듈 배럴 export 무결성
  {
    const dataHooks = await import('./index');
    assert.ok(typeof dataHooks.useMoaTable === 'function', 'useMoaTable 함수가 export 되어야 함');
    assert.ok(typeof dataHooks.useMoaList === 'function', 'useMoaList 함수가 export 되어야 함');
    assert.ok(typeof dataHooks.useMoaMutation === 'function', 'useMoaMutation 함수가 export 되어야 함');
    assert.ok(typeof dataHooks.useMoaForm === 'function', 'useMoaForm 함수가 export 되어야 함');
    console.log('  ✔ Suite 4: Moa Data Hooks Public API 배럴 무결성 확인 완료');
  }

  console.log('\n✨ [useMoaData Hooks Suite] 모든 Phase 1 데이터 훅 검증 통과!\n');
}

void runMoaDataHooksSuite();
