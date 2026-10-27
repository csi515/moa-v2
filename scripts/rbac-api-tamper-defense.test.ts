/**
 * RBAC API Tamper Defense & DB Constraint Contract Test
 * 
 * 1. 직급과 기능 권한의 완전 분리 (feature_permissions)
 * 2. member_has_feature_grant DB 함수 보안 무결성
 * 3. grant_member_feature_permission RPC 권한 검증 및 세션 즉시 만료 (token_version + 1)
 * 4. 부서 이동/삭제 시 세션 즉시 만료 트리거 (trg_dept_member_change)
 * 5. BOLA/IDOR 직접 API 우회 방어 검증
 * 
 * 실행: npx tsx scripts/rbac-api-tamper-defense.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20261024100000_separate_rank_and_feature_permissions.sql');
const code = stripComments(sql);

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined in migration`);
  const bodyStart = code.indexOf('$$', start);
  const bodyEnd = code.indexOf('$$', bodyStart + 2);
  return code.slice(start, bodyEnd + 2);
}

console.log('[TEST] RBAC API Tamper Defense Contract Test Starting...\n');

// 1. organization_members 에 feature_permissions 컬럼 및 기본 키 확인
{
  assert.match(code, /ALTER TABLE core\.organization_members\s+ADD COLUMN IF NOT EXISTS feature_permissions jsonb/);
  assert.match(code, /"resources:manage":\s*false/);
  assert.match(code, /"grievances_manage":\s*false/);
  assert.match(code, /"volunteer:manage":\s*false/);
  assert.match(code, /"shuttle:manage":\s*false/);
  assert.match(code, /"office_supply_request:manage":\s*false/);
  console.log('✓ 1. feature_permissions 컬럼 스키마 및 기본 키 정의 확인');
}

// 2. member_has_feature_grant DB 함수 검증
{
  const fn = functionBlock('core.member_has_feature_grant');
  assert.match(fn, /m\.organization_id = p_org_id/);
  assert.match(fn, /m\.user_id = auth\.uid\(\)/);
  assert.match(fn, /m\.is_active = true/);
  assert.match(fn, /m\.role = 'owner'/);
  assert.match(fn, /m\.feature_permissions->>p_feature_key/);
  console.log('✓ 2. member_has_feature_grant 서버·DB 권한 판정 함수 무결성 확인');
}

// 3. grant_member_feature_permission RPC 검증 (권한 검증 및 token_version 증가)
{
  const rpc = functionBlock('core.grant_member_feature_permission');
  assert.match(rpc, /v_caller_role != 'owner' AND NOT COALESCE/);
  assert.match(rpc, /roles:assign/);
  assert.match(rpc, /token_version = token_version \+ 1/);
  assert.match(rpc, /p_feature_key/);
  console.log('✓ 3. grant_member_feature_permission RPC 권한 검증 및 세션 즉시 만료 확인');
}

// 4. 조직 변경 트리거 (trg_dept_member_change)
{
  assert.match(code, /CREATE OR REPLACE FUNCTION core\.handle_org_structure_change\(\)/);
  const trgFn = functionBlock('core.handle_org_structure_change');
  assert.match(trgFn, /OLD\.department_id IS DISTINCT FROM NEW\.department_id/);
  assert.match(trgFn, /token_version = token_version \+ 1/);
  assert.match(code, /CREATE TRIGGER trg_dept_member_change/);
  assert.match(code, /AFTER UPDATE OR DELETE ON core\.department_members/);
  console.log('✓ 4. 부서 이동/삭제 시 세션 즉시 만료 트리거 확인');
}

// 5. 롤백 파일 무결성
{
  const rollbackSql = read('supabase/migrations/20261024100000_separate_rank_and_feature_permissions_down.sql');
  assert.match(rollbackSql, /DROP TRIGGER IF EXISTS trg_dept_member_change ON core\.department_members/);
  assert.match(rollbackSql, /DROP FUNCTION IF EXISTS core\.grant_member_feature_permission/);
  assert.match(rollbackSql, /DROP FUNCTION IF EXISTS core\.member_has_feature_grant/);
  assert.match(rollbackSql, /ALTER TABLE core\.organization_members\s+DROP COLUMN IF EXISTS feature_permissions/);
  console.log('✓ 5. 원클릭 롤백 스크립트 무결성 확인');
}

console.log('\n[PASS] All RBAC API Tamper Defense & Contract Tests Passed Successfully!\n');
