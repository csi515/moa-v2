/**
 * member-scope 하드닝 마이그레이션 정적 검증
 * (DB 접속 없이 SQL이 is_org_member 전면 접근을 staff_actor/본인 스코프로 바꾸는지 확인)
 * 실행: npm run test:rls-member-scope-harden
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hardenPath = join(
  root,
  'supabase/migrations/20260922220000_harden_member_scoped_rls.sql'
);
const sessionPassPath = join(
  root,
  'supabase/migrations/20260922210000_session_passes_booking_status_atomic.sql'
);

const hardenSql = readFileSync(hardenPath, 'utf8');
const legacyPassSql = readFileSync(sessionPassPath, 'utf8');

// 레거시: session_passes + RPC가 is_org_member 사용
assert.match(
  legacyPassSql,
  /session_passes_select_member[\s\S]*?core\.is_org_member\(organization_id\)/
);
assert.match(
  legacyPassSql,
  /IF NOT core\.is_org_member\(p_organization_id\) AND NOT core\.is_org_admin\(p_organization_id\)/
);

// 하드닝: SELECT 스코프 + staff INSERT/UPDATE
assert.match(hardenSql, /session_passes_select_scoped/);
assert.match(hardenSql, /core\.is_org_staff_actor\(organization_id\)/);
assert.match(hardenSql, /core\.is_my_customer\(organization_id, customer_id\)/);
assert.match(hardenSql, /core\.parent_owns_student\(organization_id, customer_id\)/);
assert.match(hardenSql, /session_passes_insert_staff/);
assert.match(hardenSql, /session_passes_update_staff/);

// RPC 게이트 staff_actor
assert.match(
  hardenSql,
  /IF NOT core\.is_org_staff_actor\(p_organization_id\) THEN/
);
assert.doesNotMatch(
  hardenSql,
  /IF NOT core\.is_org_member\(p_organization_id\)/
);

// Retail SELECT
assert.match(hardenSql, /CREATE POLICY core_inventory_select[\s\S]*?is_org_staff_actor/);
assert.match(hardenSql, /CREATE POLICY core_sales_select[\s\S]*?is_my_customer/);
assert.match(hardenSql, /CREATE POLICY core_sale_returns_select[\s\S]*?is_org_staff_actor/);

// Enrollment / links
assert.match(hardenSql, /student_enrollments_select_scoped/);
assert.match(
  hardenSql,
  /CREATE POLICY parent_student_links_select[\s\S]*?is_org_staff_actor\(organization_id\)/
);
assert.doesNotMatch(
  hardenSql.match(
    /CREATE POLICY parent_student_links_parent_select[\s\S]*?;/
  )?.[0] ?? '',
  /is_org_member/
);

console.log('rls-member-scope-harden.test: ok');
console.log(
  JSON.stringify(
    {
      fixed: [
        'session_passes SELECT/INSERT/UPDATE',
        'update_booking_status_with_pass gate',
        'inventory/stock_movements SELECT',
        'sales/returns SELECT scoped',
        'student_enrollments/parent_student_links SELECT',
      ],
      leftAsMemberCatalog: ['products', 'product_variants'],
    },
    null,
    2
  )
);
