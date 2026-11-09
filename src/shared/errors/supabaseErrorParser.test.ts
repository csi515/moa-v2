/**
 * Supabase Error Parser Invariant Tests
 * 실행: npx tsx src/shared/errors/supabaseErrorParser.test.ts
 */

import assert from 'node:assert/strict';
import { parseSupabaseError } from './supabaseErrorParser';

async function runTests() {
  console.log('🧪 [Supabase Error Parser] 테스트 실행 시작...');

  // 1. RLS 403 / 42501 권한 거부 테스트
  {
    const rlsErr = {
      code: '42501',
      message: 'new row violates row-level security policy for table "customers"',
    };
    const parsed = parseSupabaseError(rlsErr, { entity: '수강생', action: '등록' });
    assert.equal(parsed.code, 'PERMISSION_DENIED');
    assert.match(parsed.userMessage, /수강생 등록 권한이 없습니다/);
    console.log('  ✔ RLS 403 권한 거부 에러 파싱 통과');
  }

  // 2. 유니크 키 중복 충돌 (23505)
  {
    const dupErr = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_audit_logs_org_idempotency"',
    };
    const parsed = parseSupabaseError(dupErr, { entity: '출석 기록' });
    assert.equal(parsed.code, 'UNIQUE_VIOLATION');
    assert.match(parsed.userMessage, /이미 등록된 출석 기록 정보가 존재합니다/);
    console.log('  ✔ Unique 제약조건 충돌 에러 파싱 통과');
  }

  // 3. 비관적 락 경합 (55P03)
  {
    const lockErr = {
      code: '55P03',
      message: 'could not obtain lock on row in relation "rooms"',
    };
    const parsed = parseSupabaseError(lockErr, { entity: '연습실' });
    assert.equal(parsed.code, 'LOCK_NOT_AVAILABLE');
    assert.match(parsed.userMessage, /다른 사용자가 동일한 연습실을\(를\) 처리 중입니다/);
    console.log('  ✔ 비관적 락(55P03) 경합 에러 파싱 통과');
  }

  // 4. 외래키 위반 (23503)
  {
    const fkErr = {
      code: '23503',
      message: 'insert or update on table "schedules" violates foreign key constraint',
    };
    const parsed = parseSupabaseError(fkErr, { entity: '수업 일정', action: '예약' });
    assert.equal(parsed.code, 'FOREIGN_KEY_VIOLATION');
    assert.match(parsed.userMessage, /연결된 상위 정보가 존재하지 않거나 삭제되어/);
    console.log('  ✔ 외래키 위반 에러 파싱 통과');
  }

  // 5. 네트워크 에러
  {
    const netErr = new Error('Failed to fetch');
    const parsed = parseSupabaseError(netErr);
    assert.equal(parsed.code, 'NETWORK_ERROR');
    assert.match(parsed.userMessage, /네트워크 연결이 원활하지 않습니다/);
    console.log('  ✔ 네트워크 오류 파싱 통과');
  }

  console.log('🎉 모든 Supabase Error Parser 테스트 통과!\n');
}

void runTests();
