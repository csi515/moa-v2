import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20261012100000_safe_transfer_customer_identity.sql');
const code = stripComments(sql);

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const bodyStart = code.indexOf('$$', start);
  const bodyEnd = code.indexOf('$$', bodyStart + 2);
  return code.slice(start, bodyEnd + 2);
}

// 1) Customer transfer tokens table definition
{
  assert.match(code, /CREATE TABLE IF NOT EXISTS core\.customer_transfer_tokens/);
  assert.match(code, /token_hash\s+TEXT NOT NULL/);
  assert.match(code, /target_phone\s+TEXT NOT NULL/);
  assert.match(code, /target_customer_name\s+TEXT NOT NULL/);
  assert.match(code, /expires_at\s+TIMESTAMPTZ NOT NULL DEFAULT \(now\(\) \+ interval '5 minutes'\)/);
  assert.match(code, /used_at\s+TIMESTAMPTZ/);
}

// 2) issue_customer_transfer_token helper
{
  const body = functionBlock('core.issue_customer_transfer_token');
  assert.match(body, /auth\.uid\(\) IS NULL/);
  assert.match(body, /core\.is_org_staff_actor\(p_organization_id\)/);
  assert.match(body, /sha256\(convert_to\(upper\(trim\(v_raw_token\)\), 'utf8'\)\)/);
  assert.match(body, /interval '5 minutes'/);
}

// 3) safe_transfer_customer_identity: 5분 TTL, 이름 일치, Deadlock 방어, 원자적 병합
{
  const body = functionBlock('core.safe_transfer_customer_identity');
  // 토큰 유효성 및 5분 TTL 검증
  assert.match(body, /TOKEN_NOT_FOUND/);
  assert.match(body, /TOKEN_ALREADY_USED/);
  assert.match(body, /TOKEN_EXPIRED/);
  assert.match(body, /interval '5 minutes'/);

  // 고객 이름 일치 여부 확인
  assert.match(body, /NAME_MISMATCH/);
  assert.match(body, /lower\(trim\(p_customer_name\)\) <> lower\(trim\(v_token\.target_customer_name\)\)/);

  // Deadlock 방어: ID 오름차순 정렬 행 잠금
  assert.match(body, /ORDER BY id ASC/);
  assert.match(body, /FOR UPDATE/);

  // 빈 레코드 (Placeholder: user_id IS NULL) 원자적 병합
  assert.match(body, /UPDATE core\.reservations/);
  assert.match(body, /UPDATE core\.attendance_sessions/);
  assert.match(body, /UPDATE core\.session_passes/);
  assert.match(body, /status = 'merged'/);

  // 토큰 1회용 사용 완료 마킹
  assert.match(body, /UPDATE core\.customer_transfer_tokens/);
  assert.match(body, /SET used_at = now\(\)/);
}

// 4) safe_transfer_customer_identity conflict hardening migration
{
  const hardeningSql = read('supabase/migrations/20261018223000_safe_transfer_conflict_hardening.sql');
  const hardeningCode = stripComments(hardeningSql);
  assert.match(hardeningCode, /ALREADY_BOUND_TO_ANOTHER_USER/);
  assert.match(hardeningCode, /ERR_PHONE_DUPLICATE_IN_TENANT/);
  assert.match(hardeningCode, /WHEN unique_violation THEN/);
  assert.match(hardeningCode, /user_id IS NOT NULL/);
  assert.match(hardeningCode, /user_id <> v_caller_uid/);
}

console.log('safe-transfer-customer-identity test passed');

