/**
 * 2026-09-28 staff invite token flow 정적 검증 (DB 접속 없음)
 * - invite_staff_member: 이메일 일치 즉시 연결 제거, 토큰 발급('invited' + token)
 * - accept_staff_invite: pending/미만료/미취소 검증 후에만 organization_members, 역할은 staff 고정
 * - 토큰 원문 미저장(해시), 재발급 시 교체, 취소 시 폐기
 * - staff_invitations 직접 쓰기 정책 제거, 이메일 일치 SELECT 정책 제거
 * - 레거시 redeem_guardian_link_token(TEXT) 제거, register_auth_provider 는 client email 불신
 * - 클라이언트: staff_link 딥링크 → 수락 모달(자동 수락 없음), 관리자 재발급/취소 UI
 * 기능 검증(로컬 Postgres): supabase/tests/staff_invite_token_flow.sql
 * 실행: npm run test:staff-invite-token
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20260928140000_staff_invite_token_flow.sql');
const code = stripComments(sql);

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const bodyStart = code.indexOf('$$', start);
  const bodyEnd = code.indexOf('$$', bodyStart + 2);
  return code.slice(start, bodyEnd + 2);
}

// 1) invite_staff_member: 시그니처 유지, 이메일 일치 연결 없음, 토큰 발급
{
  const body = functionBlock('core.invite_staff_member');
  assert.match(body, /p_org_id UUID,\s*p_staff_id UUID,\s*p_email TEXT/);
  assert.match(body, /core\.is_org_admin\(p_org_id\)/);
  assert.doesNotMatch(body, /core\.profiles|auth\.users|find_user_id_by_identity_email/, 'no email → account lookup');
  assert.doesNotMatch(body, /INSERT INTO core\.organization_members/, 'invite must not create membership');
  assert.doesNotMatch(body, /SET user_id\s*=/i, 'invite must not link staff.user_id');
  assert.match(body, /generate_staff_invite_token\(\)/);
  assert.match(body, /token_hash = EXCLUDED\.token_hash/, 'reissue replaces old token');
  assert.match(body, /'status', 'invited'/);
  assert.match(body, /'token', v_token/);
  assert.match(body, /interval '7 days'/);
}

// 2) 토큰: 내장 난수/해시, 원문 미저장
{
  const gen = functionBlock('core.generate_staff_invite_token');
  assert.match(gen, /gen_random_uuid\(\)/);
  assert.match(gen, /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/);
  const hash = functionBlock('core.hash_staff_invite_token');
  assert.match(hash, /sha256\(/);
  assert.match(code, /REVOKE ALL ON FUNCTION core\.generate_staff_invite_token\(\) FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(code, /\btoken\s+TEXT\b/i, 'no raw token column');
}

// 3) accept: 검증 조건 + 역할 고정 + 1회용
{
  const body = functionBlock('core.accept_staff_invite');
  for (const cond of [/si\.status = 'pending'/, /si\.revoked_at IS NULL/, /si\.expires_at > now\(\)/, /FOR UPDATE/]) {
    assert.match(body, cond);
  }
  assert.match(body, /VALUES \(v_inv\.organization_id, v_uid, 'staff', v_staff\.id, true\)/);
  assert.doesNotMatch(body, /v_inv\.role/, 'must not grant invitation.role');
  assert.match(body, /status = 'accepted'[\s\S]*token_hash = NULL/);
  assert.match(body, /v_staff\.user_id IS NOT NULL AND v_staff\.user_id <> v_uid/);
}
assert.match(functionBlock('core.preview_staff_invite'), /si\.expires_at > now\(\)/);
assert.match(functionBlock('core.revoke_staff_invitation'), /token_hash = NULL/);
assert.match(code, /GRANT EXECUTE ON FUNCTION core\.accept_staff_invite\(TEXT\) TO authenticated/);
assert.match(code, /REVOKE ALL ON FUNCTION core\.accept_staff_invite\(TEXT\) FROM PUBLIC, anon/);

// 4) RLS: 이메일 일치 SELECT 제거, 직접 쓰기 제거
assert.match(code, /DROP POLICY IF EXISTS staff_invitations_select ON core\.staff_invitations/);
assert.match(code, /DROP POLICY IF EXISTS staff_invitations_insert ON core\.staff_invitations/);
assert.match(code, /DROP POLICY IF EXISTS staff_invitations_update ON core\.staff_invitations/);
assert.doesNotMatch(code, /CREATE POLICY[^;]*staff_invitations[^;]*profiles/);

// 5) 레거시 오버로드 / register_auth_provider
assert.match(code, /DROP FUNCTION IF EXISTS core\.redeem_guardian_link_token\(TEXT\);/);
assert.doesNotMatch(code, /DROP FUNCTION IF EXISTS core\.redeem_guardian_link_token\(TEXT,\s*JSONB\)/i);
{
  const body = functionBlock('core.register_auth_provider');
  assert.match(body, /p_email TEXT DEFAULT NULL/);
  assert.doesNotMatch(body.slice(body.indexOf('BEGIN')), /normalize_identity_email\(p_email\)|\bp_email\b/, 'p_email must be ignored');
  assert.match(body, /FROM auth\.users u/);
  assert.match(body, /IF p_provider = 'email' THEN/);
}

// 6) 클라이언트
const service = read('src/core/staff/services/staffAccountService.ts');
assert.match(service, /rpc\('accept_staff_invite'/);
assert.match(service, /rpc\('preview_staff_invite'/);
assert.match(service, /\?staff_link=/);
const gate = read('src/core/staff/components/PendingStaffInviteGate.tsx');
assert.match(gate, /peekPendingStaffLink\(\)/);
assert.doesNotMatch(gate, /acceptStaffInvite\(/, 'gate must not auto-accept');
const acceptModal = read('src/core/staff/components/StaffInviteAcceptModal.tsx');
assert.match(acceptModal, /previewStaffInvite\(/);
assert.match(acceptModal, /acceptStaffInvite\(code\)/);
assert.match(read('src/SupabaseAppGate.tsx'), /<PendingStaffInviteGate \/>/);
assert.match(read('src/core/platform/bootstrapDeepLinks.ts'), /notifyStaffLinkPending\(\)/);
const teacherView = read('src/core/academy/components/teachers/TeacherManagementView.tsx');
assert.match(teacherView, /<StaffInviteResultModal/);
assert.match(teacherView, /재발급/);
assert.doesNotMatch(teacherView, /가입 시 자동 연결|다시 초대하면 연결/);
assert.match(read('src/core/organizations/OrganizationSelector.tsx'), /<StaffInviteAcceptModal/);

console.log('staff-invite-token static checks: OK');
