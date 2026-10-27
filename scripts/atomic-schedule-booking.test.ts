import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20261012130000_atomic_schedule_booking.sql');
const code = stripComments(sql);

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const bodyStart = code.indexOf('$$', start);
  const bodyEnd = code.indexOf('$$', bodyStart + 2);
  return code.slice(start, bodyEnd + 2);
}

// 1. book_schedule_slot RPC: Row Lock, Capacity Guard, Pass Atomic Deduction
{
  const rpcBody = functionBlock('core.book_schedule_slot');

  // 인증 확인
  assert.match(rpcBody, /IF auth\.uid\(\) IS NULL THEN/);

  // 행 잠금 (SELECT ... FOR UPDATE OF s)
  assert.match(rpcBody, /FROM core\.schedules s/);
  assert.match(rpcBody, /FOR UPDATE OF s/);

  // 고객 유효성 및 소속 조직 검증
  assert.match(rpcBody, /FROM core\.customers c[\s\S]*?FOR UPDATE/);
  assert.match(rpcBody, /ORGANIZATION_MISMATCH/);

  // 중복 예약 차단
  assert.match(rpcBody, /ALREADY_BOOKED/);

  // 잔여석(capacity) 카운트 검증 및 오버부킹 시 EXCEPTION
  assert.match(rpcBody, /COUNT\(\*\)[\s\S]*?FROM core\.reservations/);
  assert.match(rpcBody, /v_booked_count >= v_schedule\.max_capacity/);
  assert.match(rpcBody, /SCHEDULE_CAPACITY_EXCEEDED/);

  // 수강권(session_passes) 잠금 및 원자적 횟수(-1) 차감
  assert.match(rpcBody, /FROM core\.session_passes p[\s\S]*?FOR UPDATE/);
  assert.match(rpcBody, /PASS_NOT_ACTIVE/);
  assert.match(rpcBody, /PASS_EXPIRED/);
  assert.match(rpcBody, /PASS_EXHAUSTED/);
  assert.match(rpcBody, /UPDATE core\.session_passes[\s\S]*?used_sessions = used_sessions \+ 1/);

  // 단일 트랜잭션 내 core.reservations INSERT
  assert.match(rpcBody, /INSERT INTO core\.reservations/);
  assert.match(rpcBody, /RETURNING id INTO v_reservation_id/);

  // 권한 부여
  assert.match(code, /GRANT EXECUTE ON FUNCTION core\.book_schedule_slot/);
  assert.match(code, /CREATE OR REPLACE FUNCTION public\.book_schedule_slot/);
}

// 2. organizations RLS 및 구조화 주소 보강
{
  // RLS 정책 (authenticated 허용)
  assert.match(code, /DROP POLICY IF EXISTS organizations_insert ON core\.organizations/);
  assert.match(code, /CREATE POLICY organizations_insert ON core\.organizations/);
  assert.match(code, /WITH CHECK \(auth\.uid\(\) IS NOT NULL\)/);

  // INSERT 전 트리거: settings->'addressParts' 자동 언패킹
  const beforeInsertBody = functionBlock('core.handle_organization_before_insert');
  assert.match(beforeInsertBody, /NEW\.settings \? 'addressParts'/);
  assert.match(beforeInsertBody, /NEW\.sido := COALESCE\(NEW\.sido/);
  assert.match(beforeInsertBody, /NEW\.sigungu := COALESCE\(NEW\.sigungu/);
  assert.match(beforeInsertBody, /NEW\.dong := COALESCE\(NEW\.dong/);
  assert.match(beforeInsertBody, /NEW\.road_address := COALESCE\(NEW\.road_address/);
  assert.match(code, /CREATE TRIGGER trg_org_before_insert/);

  // INSERT 후 트리거: owner 멤버십 자동 등록
  const afterInsertBody = functionBlock('core.handle_organization_after_insert');
  assert.match(afterInsertBody, /INSERT INTO core\.organization_members \(organization_id, user_id, role\)/);
  assert.match(afterInsertBody, /VALUES \(NEW\.id, auth\.uid\(\), 'owner'\)/);
  assert.match(code, /CREATE TRIGGER trg_org_after_insert/);
}

console.log('atomic-schedule-booking test passed');
