/**
 * 2026-09-28 신규 학부모 redeem 실패 수정 + 학부모 고객 재지정 차단 정적 검증 (DB 접속 없음)
 * - ensure_org_parent_customer: 새 조직 고객 id = 전역 parents id, 타 계정 연결 고객 이메일 매칭 금지
 * - sync_customer_to_global_models: user_id 가 다른 parents 에 있으면 중복 생성 대신 org_parent_profiles 매핑
 * - sync_parent_link_to_guardian / sync_org_parent_student_bridge: 매핑을 따라 guardians 기록
 * - redeem/preview: parent_already_linked 거절 (코드 미소비), 시그니처 유지
 * 기능 검증(로컬 Postgres): supabase/tests/guardian_redeem_new_parent.sql
 * 실행: npm run test:guardian-redeem-new-parent
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const stripComments = (s: string) => s.replace(/--[^\n]*/g, '');

const code = stripComments(read('supabase/migrations/20260928160000_guardian_redeem_new_parent.sql'));

function functionBlock(name: string): string {
  const start = code.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  assert.ok(start >= 0, `${name} not defined`);
  const m = /AS\s+(\$[A-Za-z_]*\$)/.exec(code.slice(start));
  assert.ok(m, `${name}: body delimiter not found`);
  const tag = m[1];
  const bodyStart = start + m.index + m[0].length;
  const bodyEnd = code.indexOf(tag, bodyStart);
  return code.slice(start, bodyEnd + tag.length);
}

// 0) 순서: #85 이후
assert.ok('20260928160000' > '20260928150000');

// 1) ensure_org_parent_customer
{
  const body = functionBlock('core.ensure_org_parent_customer');
  assert.match(body, /p_parent_id uuid, p_org_id uuid/);
  assert.match(body, /THEN gen_random_uuid\(\) ELSE p_parent_id END/, 'aligned customer id');
  assert.match(body, /c\.user_id IS NULL OR c\.user_id = v_parent\.user_id/, 'email match excludes other accounts');
}

// 2) sync_customer_to_global_models: owner 분기
{
  const body = functionBlock('core.sync_customer_to_global_models');
  assert.match(body, /WHERE p\.user_id = NEW\.user_id AND p\.id <> NEW\.id/);
  const ownerIdx = body.indexOf('IF v_owner IS NOT NULL THEN');
  const insertParentsIdx = body.indexOf('INSERT INTO core.parents');
  assert.ok(ownerIdx > 0 && ownerIdx < insertParentsIdx, 'owner branch before parents upsert');
  assert.match(body, /VALUES \(v_owner, NEW\.organization_id, NEW\.id/);
}

// 3) 매핑을 따르는 guardians 동기화
{
  const link = functionBlock('core.sync_parent_link_to_guardian');
  assert.match(link, /FROM core\.org_parent_profiles o\s+WHERE o\.customer_id = NEW\.parent_customer_id/);
  assert.match(link, /FROM core\.org_parent_profiles o\s+WHERE o\.customer_id = OLD\.parent_customer_id/);
  assert.match(link, /VALUES \(\s*v_parent_id,/);
  const bridge = functionBlock('core.sync_org_parent_student_bridge');
  assert.match(bridge, /owned_elsewhere/);
  assert.match(bridge, /DISTINCT ON \(m\.parent_id, se\.student_id\)/);
  assert.match(bridge, /p_org_id uuid/);
}

// 4) redeem/preview 재지정 차단 + 시그니처
{
  const redeem = functionBlock('core.redeem_guardian_link_token');
  assert.match(redeem, /p_token text,\s*p_shared_fields jsonb DEFAULT/);
  const guard = redeem.indexOf("'parent_already_linked'");
  const firstMutation = redeem.indexOf('ensure_global_parent_profile()');
  assert.ok(guard > 0 && guard < firstMutation, 're-point guard before any mutation');
  assert.match(redeem, /v_pc_user IS NOT NULL AND v_pc_user <> v_uid/);
  assert.match(redeem, /v_pp_user IS NOT NULL AND v_pp_user <> v_uid/);
  for (const k of ['success', 'student_name', 'organization_name', 'organization_id', 'student_id', 'merged_duplicates', 'links_synced']) {
    assert.ok(redeem.includes(`'${k}'`), `redeem returns ${k}`);
  }
  const preview = functionBlock('core.preview_guardian_link_token');
  assert.match(preview, /\(p_token text\)/);
  assert.match(preview, /'parent_already_linked'/);
  assert.doesNotMatch(code, /(?<![.\w])digest\(/);
}

// 5) 클라이언트 메시지
{
  const svc = read('src/core/parent/services/guardianLinkService.ts');
  assert.match(svc, /case 'parent_already_linked':/);
}

console.log('guardian-redeem-new-parent.test.ts: all assertions passed');
