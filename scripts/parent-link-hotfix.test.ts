/**
 * 2026-09-28 parent-link hotfix 정적 검증 (DB 접속 없음)
 * - profiles.email 은 auth.users.email 로 강제 (트리거)
 * - connect_parent_on_login / connect_staff_on_login 은 no-op (시그니처 유지)
 * - invite_parent_member 는 이메일 일치 자동 연결 없이 항상 'invited'
 * - send-parent-invitation 은 인증 + DB 기반 수신자 + APP_URL + HTML escape
 * - 클라이언트는 이메일/이름/appUrl 을 Edge Function 에 보내지 않음
 * 기능 검증(로컬 Postgres): supabase/tests/parent_link_hotfix.sql
 * 실행: npm run test:parent-link-hotfix
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const sql = read('supabase/migrations/20260928130000_parent_link_hotfix_email_identity.sql');
const edge = read('supabase/functions/send-parent-invitation/index.ts');
const inviteService = read('src/core/parent/services/parentInviteService.ts');
const parentView = read('src/core/academy/components/parents/ParentManagementView.tsx');
const audit = read('supabase/audits/20260928_parent_link_audit.sql');

/** CREATE OR REPLACE FUNCTION <name>(...) ... $$ body $$ 를 잘라낸다 */
function functionBlock(source: string, name: string): string {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not redefined in hotfix migration`);
  const bodyStart = source.indexOf('$$', start);
  const bodyEnd = source.indexOf('$$', bodyStart + 2);
  assert.ok(bodyStart > 0 && bodyEnd > bodyStart, `${name} body not found`);
  return source.slice(start, bodyEnd + 2);
}
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

// 1) profiles.email 보호
assert.match(sql, /CREATE TRIGGER trg_profiles_email_from_auth\s+BEFORE INSERT OR UPDATE[\s\S]*?ON core\.profiles/);
assert.match(functionBlock(sql, 'core.enforce_profile_email_from_auth'), /FROM auth\.users/);
assert.match(sql, /CREATE TRIGGER on_auth_user_email_updated[\s\S]*?ON auth\.users/);
assert.match(sql, /core\.security_profile_email_snapshot/);
assert.match(sql, /REVOKE ALL ON core\.security_profile_email_snapshot FROM anon, authenticated/);

// 2) identity helper 는 auth.users 만 신뢰, 일반 사용자 실행 불가
for (const fn of ['core.user_identity_matches_email', 'core.find_user_id_by_identity_email']) {
  const body = stripComments(functionBlock(sql, fn));
  assert.match(body, /auth\.users/, `${fn} must read auth.users`);
  assert.doesNotMatch(body, /core\.profiles|auth_providers/, `${fn} must not trust profiles/auth_providers email`);
}
assert.match(sql, /REVOKE EXECUTE ON FUNCTION core\.find_user_id_by_identity_email\(TEXT\) FROM PUBLIC, anon, authenticated/);
assert.match(sql, /REVOKE EXECUTE ON FUNCTION core\.user_identity_matches_email\(UUID, TEXT\) FROM PUBLIC, anon, authenticated/);

// 3) connect_*_on_login no-op (시그니처/반환 모양 유지)
for (const fn of ['core.connect_parent_on_login', 'core.connect_staff_on_login']) {
  const body = stripComments(functionBlock(sql, fn));
  assert.match(body, /RETURNS JSONB/i);
  assert.match(body, /'connected',\s*0/);
  assert.match(body, /'memberships',\s*'\[\]'::jsonb/i);
  assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE)\b/, `${fn} must not write`);
}

// 4) invite_parent_member: 자동 연결 분기 제거
{
  const body = stripComments(functionBlock(sql, 'core.invite_parent_member'));
  assert.match(body, /p_org_id UUID,\s*p_parent_customer_id UUID,\s*p_email TEXT/);
  assert.doesNotMatch(body, /find_user_id_by_identity_email|user_identity_matches_email/);
  assert.doesNotMatch(body, /'status',\s*'connected'/);
  assert.doesNotMatch(body, /SET user_id\s*=/i, 'invite must not set user_id');
  assert.match(body, /create_parent_invite_link_tokens/);
  assert.match(body, /'status',\s*'invited'/);
}

// 5) 메일 컨텍스트 RPC: 관리자 검증 + 일반화된 오류
{
  const body = functionBlock(sql, 'core.get_parent_invite_email_context');
  assert.match(body, /SECURITY DEFINER/);
  assert.match(body, /core\.is_org_admin\(/);
  assert.match(body, /Invalid invitation request/);
}

// 6) Edge Function 하드닝
assert.match(edge, /auth\.getUser\(\)/);
assert.match(edge, /rpc\("get_parent_invite_email_context"/);
assert.match(edge, /Deno\.env\.get\("APP_URL"\)/);
assert.match(edge, /function escapeHtml/);
assert.doesNotMatch(edge, /payload\.appUrl|body\.appUrl|body\.email|payload\.email/);
assert.doesNotMatch(edge, /자동 연결됩니다/);
assert.doesNotMatch(edge, /message:\s*errText|err\.message/, 'must not leak internal errors');
assert.match(edge, /to:\s*\[ctx\.email\]/);

// 7) 클라이언트: 토큰만 전송, 'connected' 분기 및 자동 연결 문구 제거
const sendFn = inviteService.slice(inviteService.indexOf('export async function sendParentInvitationEmail'));
assert.doesNotMatch(sendFn, /appUrl|email:|parentName|organizationName/);
assert.doesNotMatch(parentView, /result\.status === 'connected'/);
assert.doesNotMatch(parentView, /자동 연결되며/);

// 8) 감사 스크립트는 읽기 전용
assert.match(audit, /BEGIN TRANSACTION READ ONLY;/);
assert.match(audit, /ROLLBACK;\s*$/);
assert.doesNotMatch(stripComments(audit), /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CREATE)\b/i);

console.log('parent-link-hotfix static checks: OK');
