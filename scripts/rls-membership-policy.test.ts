/**
 * organization_members INSERT RLS 정책 정적 검증
 * (DB 접속 없이 마이그레이션 SQL이 의도한 WITH CHECK를 갖는지 확인)
 * 실행: npm run test:rls-membership-policy
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = join(
  root,
  'supabase/migrations/20260921100000_harden_organization_members_insert_rls.sql'
);
const legacyPath = join(
  root,
  'supabase/migrations/20260822000003_create_core_rls.sql'
);

const hardenSql = readFileSync(migrationPath, 'utf8');
const legacySql = readFileSync(legacyPath, 'utf8');

// 레거시 취약 조건이 원본에 존재했음을 문서화
assert.match(
  legacySql,
  /CREATE POLICY organization_members_insert[\s\S]*?user_id = auth\.uid\(\)/,
  'legacy INSERT policy used to allow self-insert via user_id = auth.uid()'
);

// 하드닝 마이그레이션: self-insert 제거, owner/admin만
assert.match(
  hardenSql,
  /DROP POLICY IF EXISTS organization_members_insert ON core\.organization_members/
);
assert.match(
  hardenSql,
  /CREATE POLICY organization_members_insert ON core\.organization_members/
);

const policyBody = hardenSql.match(
  /CREATE POLICY organization_members_insert ON core\.organization_members[\s\S]*?;/
)?.[0];
assert.ok(policyBody, 'CREATE POLICY organization_members_insert body missing');
assert.match(
  policyBody,
  /WITH CHECK\s*\(\s*core\.is_org_owner_or_admin\(organization_id\)\s*\)/
);
assert.doesNotMatch(
  policyBody,
  /user_id\s*=\s*auth\.uid\(\)/,
  'hardened policy body must not allow user_id = auth.uid() self-insert'
);

// 조직 직접 INSERT는 이미 false (선행 보안 마이그레이션)
const orgInsertHardening = readFileSync(
  join(
    root,
    'supabase/migrations/20260910073000_phase1_security_customer_separation.sql'
  ),
  'utf8'
);
assert.match(
  orgInsertHardening,
  /CREATE POLICY organizations_insert ON core\.organizations[\s\S]*?WITH CHECK \(false\)/
);

console.log('rls-membership-policy.test: ok');
console.log(
  JSON.stringify(
    {
      blockedPath: 'organization_members INSERT where user_id = auth.uid()',
      allowedInsert: 'is_org_owner_or_admin(organization_id)',
      firstOwnerVia: 'core.create_organization SECURITY DEFINER',
      inviteVia: 'invite_*/connect_*/approve_* SECURITY DEFINER RPCs',
    },
    null,
    2
  )
);
