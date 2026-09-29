/**
 * 2026-09-28 STEP 2 guardian link hardening 정적 검증 (DB 접속 없음)
 * - 연결 코드: 20자 Crockford base32, builtin gen_random_uuid()/sha256 (digest() 비의존)
 * - max_uses=1·최대 7일 강제(트리거 포함), 재발급 시 이전 활성 코드 자동 폐기
 * - preview/redeem: 시도 기록 + rate limit(예외 대신 상태 JSON) + audit_logs
 * - redeem: 퇴원(withdrawn/alumni) 자동 재활성화 금지 → guardian_enrollment_requests(pending)
 * - 학생당 계정 연결 보호자 상한 트리거 + redeem 사전 검사
 * - 연결 성공 시 core.notifications 직원 알림
 * - 클라이언트: 네이티브 공개 URL(VITE_APP_URL), 딥링크 코드 형식 검증, 토큰 관리 UI
 * 기능 검증(로컬 Postgres): supabase/tests/guardian_link_hardening.sql
 * 실행: npm run test:guardian-link-hardening
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isValidGuardianLinkCode,
  normalizeGuardianLinkCode,
  parseDeepLinksFromUrl,
} from '../src/core/platform/deepLinkParser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const sql = read('supabase/migrations/20260928150000_guardian_link_hardening.sql');
const code = stripComments(sql);

/** CREATE OR REPLACE FUNCTION name( ... AS $tag$ body $tag$ 블록 추출 ($$ / $function$ 모두) */
function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const m = /AS\s+(\$[A-Za-z_]*\$)/.exec(code.slice(start));
  assert.ok(m, `${name}: body delimiter not found`);
  const tag = m[1];
  const bodyStart = start + m.index + m[0].length;
  const bodyEnd = code.indexOf(tag, bodyStart);
  assert.ok(bodyEnd > bodyStart, `${name}: body end not found`);
  return code.slice(start, bodyEnd + tag.length);
}

// 0) 마이그레이션 순서: #84 두 파일 이후
{
  const migrations = ['20260928130000', '20260928140000', '20260928150000'];
  assert.deepEqual([...migrations].sort(), migrations);
}

// 1) 코드 생성·해시: builtin 만, digest() 없음
{
  const gen = functionBlock('core.generate_guardian_link_code');
  assert.match(gen, /0123456789ABCDEFGHJKMNPQRSTVWXYZ/, 'Crockford alphabet');
  assert.match(gen, /uuid_send\(gen_random_uuid\(\)\)/);
  assert.match(gen, /length\(v_out\) = 20/);
  const hash = functionBlock('core.guardian_link_code_hash');
  assert.match(hash, /sha256\(convert_to\(/);
  const norm = functionBlock('core.normalize_guardian_link_code');
  assert.match(norm, /translate\(/);
  assert.doesNotMatch(code, /(?<![.\w])digest\(/, 'no unqualified digest() in migration');
  for (const fn of [
    'core.create_guardian_link_token',
    'core.create_parent_invite_link_tokens',
    'core.preview_guardian_link_token',
    'core.redeem_guardian_link_token',
    'core.get_parent_invite_email_context',
  ]) {
    assert.match(functionBlock(fn), /guardian_link_code_hash\(/, `${fn} uses hash helper`);
  }
  assert.match(code, /REVOKE ALL ON FUNCTION core\.generate_guardian_link_code\(\) FROM PUBLIC, anon, authenticated/);
}

// 2) 시그니처 유지 (구버전 앱 호환)
{
  assert.match(code, /FUNCTION core\.create_guardian_link_token\(\s*p_org_id uuid,\s*p_customer_id uuid,\s*p_expires_days integer DEFAULT 7,\s*p_max_uses integer DEFAULT 1\s*\)/);
  assert.match(code, /FUNCTION core\.redeem_guardian_link_token\(\s*p_token text,\s*p_shared_fields jsonb DEFAULT/);
  assert.match(code, /FUNCTION core\.preview_guardian_link_token\(p_token text\)/);
  assert.match(code, /FUNCTION core\.create_parent_invite_link_tokens\(\s*p_org_id uuid,\s*p_parent_customer_id uuid,\s*p_expires_days integer DEFAULT 7\s*\)/);
  assert.match(code, /FUNCTION core\.check_rate_limit\(p_user_id uuid, p_limit_type text\)/);
  assert.doesNotMatch(code, /DROP FUNCTION[^;]*(redeem|preview|create)_guardian_link_token/i);
}

// 3) 1회용·7일·재발급 폐기
{
  const create = functionBlock('core.create_guardian_link_token');
  assert.match(create, /LEAST\(GREATEST\(COALESCE\(p_expires_days, 7\), 1\), 7\)/);
  assert.match(create, /'revoked_reason', 'reissued'/);
  assert.match(create, /metadata->>'parent_customer_id', ''\) IS NULL/, 'generic reissue scope');
  assert.match(create, /v_expires, 1, auth\.uid\(\)/, 'max_uses literal 1');
  const invite = functionBlock('core.create_parent_invite_link_tokens');
  assert.match(invite, /LEAST\(GREATEST\(COALESCE\(p_expires_days, 7\), 1\), 7\)/);
  assert.match(invite, /metadata->>'parent_customer_id' = p_parent_customer_id::TEXT/, 'parent invite reissue scope');
  const trig = functionBlock('core.enforce_guardian_link_token_limits');
  assert.match(trig, /NEW\.max_uses := 1/);
  assert.match(trig, /guardian_link_token_ttl\(\)/);
  assert.match(code, /BEFORE INSERT OR UPDATE ON core\.guardian_link_tokens/);
  assert.match(code, /DROP POLICY IF EXISTS guardian_link_tokens_member_select/);
}

// 4) rate limit + 시도 기록 + audit (실패는 예외 대신 상태 JSON)
{
  assert.match(code, /CREATE TABLE IF NOT EXISTS core\.guardian_link_attempts/);
  assert.match(code, /ALTER TABLE core\.guardian_link_attempts ENABLE ROW LEVEL SECURITY/);
  assert.match(code, /REVOKE ALL ON core\.guardian_link_attempts FROM PUBLIC, anon, authenticated/);
  for (const t of ['guardian_link_attempt_per_user', 'guardian_link_failure_per_user', 'guardian_link_attempt_per_token']) {
    assert.ok(code.includes(`'${t}'`), `rate limit config ${t}`);
  }
  assert.match(code, /'guardian_link'\s*\]::TEXT\[\]/, 'audit entity_type extended');
  for (const fn of ['core.preview_guardian_link_token', 'core.redeem_guardian_link_token']) {
    const body = functionBlock(fn);
    assert.match(body, /guardian_link_rate_guard\(v_uid, v_hash\)/, `${fn} rate guard`);
    assert.match(body, /log_guardian_link_attempt\(/, `${fn} logs attempts`);
    assert.match(body, /write_guardian_link_audit\(/, `${fn} audit`);
    assert.match(body, /'rate_limited'/);
    assert.match(body, /'invalid_or_expired'/);
    assert.doesNotMatch(body, /RAISE EXCEPTION 'Invalid or expired link code'/, `${fn}: failures must not roll back attempt log`);
  }
  assert.match(functionBlock('core.preview_guardian_link_token'), /VOLATILE SECURITY DEFINER/);
}

// 5) 퇴원 재활성화 금지 → pending 요청
{
  const redeem = functionBlock('core.redeem_guardian_link_token');
  assert.doesNotMatch(redeem, /SET status = 'active'/, 'redeem must not reactivate enrollment');
  assert.doesNotMatch(redeem, /UPDATE core\.student_enrollments/);
  assert.match(redeem, /v_enrollment_status IN \('withdrawn', 'alumni'\)/);
  assert.match(redeem, /INSERT INTO core\.guardian_enrollment_requests/);
  assert.match(redeem, /'linked_enrollment_pending'/);
  // 기존 반환 키 유지
  for (const k of ['success', 'student_name', 'organization_name', 'organization_id', 'student_id', 'merged_duplicates', 'links_synced']) {
    assert.ok(redeem.includes(`'${k}'`), `redeem returns ${k}`);
  }
}

// 6) 보호자 상한
{
  assert.match(functionBlock('core.max_linked_guardians_per_student'), /SELECT 2/);
  const trig = functionBlock('core.enforce_guardian_limit_per_student');
  assert.match(trig, /p\.user_id IS NOT NULL/);
  assert.match(trig, /pg_trigger_depth\(\) > 1/);
  assert.match(trig, /FOR UPDATE/);
  assert.match(code, /BEFORE INSERT ON core\.parent_student_guardians/);
  const redeem = functionBlock('core.redeem_guardian_link_token');
  const pre = redeem.indexOf("'guardian_limit_reached'");
  const firstMutation = redeem.indexOf('ensure_global_parent_profile()');
  assert.ok(pre > 0 && pre < firstMutation, 'limit pre-check happens before any mutation');
}

// 7) 직원 알림
{
  const redeem = functionBlock('core.redeem_guardian_link_token');
  assert.match(redeem, /INSERT INTO core\.notifications/);
  assert.match(redeem, /'guardian_linked'/);
}

// 8) 클라이언트: 코드 형식·네이티브 URL·UI
{
  assert.equal(parseDeepLinksFromUrl('https://x.test/?link=ab12cd34').guardianLink, 'AB12CD34');
  assert.equal(parseDeepLinksFromUrl('https://x.test/?link=7K3M-9QZX-2B4D-6F8H-1JNP').guardianLink, '7K3M9QZX2B4D6F8H1JNP');
  assert.equal(parseDeepLinksFromUrl('https://x.test/?link=ABC').guardianLink, null);
  assert.equal(normalizeGuardianLinkCode('oil'), '011');
  assert.ok(!isValidGuardianLinkCode('7K3M9QZX2B4D6F8H1JNU'));

  const appUrl = read('src/core/platform/appBaseUrl.ts');
  assert.match(appUrl, /if \(params\.native\) return env;/);
  const invite = read('src/core/parent/services/parentInviteService.ts');
  assert.match(invite, /getPublicAppBaseUrl\(\)/);
  assert.doesNotMatch(invite, /window\.location\.origin/);
  const staff = read('src/core/staff/services/staffAccountService.ts');
  assert.match(staff, /getPublicAppBaseUrl\(\)/);
  assert.doesNotMatch(staff, /window\.location\.origin/);

  const svc = read('src/core/parent/services/guardianLinkService.ts');
  assert.match(svc, /raw\.valid === false/, 'preview throws on valid:false');
  assert.match(svc, /'guardian_limit_reached'/);
  assert.match(svc, /parseGuardianLinkCode\(raw\)/);

  const modal = read('src/modules/parent/GuardianLinkInviteModal.tsx');
  assert.match(modal, /listGuardianLinkTokens\(/);
  assert.match(modal, /revokeGuardianLinkToken\(/);
  assert.match(modal, /이전 코드 폐기/);

  const shell = read('src/modules/parent/ParentShell.tsx');
  assert.doesNotMatch(shell, /maxLength=\{8\}/, 'manual input must accept 20-char codes');
}

console.log('guardian-link-hardening.test.ts: all assertions passed');
