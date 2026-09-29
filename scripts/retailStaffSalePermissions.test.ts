/**
 * Retail Staff 판매 권한 정합성
 * 실행: npm run test:retail-staff-sale-perm
 *
 * - 정적: 마이그레이션이 is_org_admin을 전역 확대하지 않고
 *   create_sale/return(+판매연동 포인트)만 is_org_staff_actor로 바꾸는지
 * - DB: MOA_DB_INTEGRATION=1 + allowlist + JWT 있으면 RPC 게이트 실검증
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  core,
  resolveDbItContext,
  saleLine,
  seedCommerceFixture,
} from './dbIntegration/harness';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260922180000_retail_staff_sale_permissions.sql'),
  'utf8'
);
const plugin = readFileSync(join(root, 'src/industries/retail/plugin.ts'), 'utf8');

// ── 정적: plugin 계약 ─────────────────────────────────────────────
assert.match(plugin, /Staff: 판매·고객·판매내역·재고\(조회만\)/);
assert.match(plugin, /staffTabs:[\s\S]*'sales'/);
assert.doesNotMatch(plugin, /staffTabs:[\s\S]*'retail'/); // 상품 탭 제외
assert.doesNotMatch(plugin, /staffTabs:[\s\S]*'settings'/);

// ── 정적: migration 계약 ──────────────────────────────────────────
assert.match(mig, /is_org_staff_actor/);
assert.match(mig, /'create_sale'/);
assert.match(mig, /'create_sale_return'/);
assert.match(mig, /'apply_point_redeem_for_sale'/);
assert.match(mig, /'apply_point_earn_for_sale'/);
assert.match(mig, /'apply_point_adjust_for_sale_return'/);
assert.match(mig, /apply_stock_movement must remain is_org_admin-only/);
assert.match(mig, /core_sales_staff_insert/);
assert.match(mig, /ARRAY\[[\s\S]*'staff'[\s\S]*'instructor'/);
// is_org_admin 정의 자체를 staff로 넓히지 않음
assert.doesNotMatch(
  mig,
  /CREATE OR REPLACE FUNCTION core\.is_org_admin[\s\S]*'staff'/
);

/** JS 모델: staff_actor 역할 집합 (SQL has_any_org_role과 동일) */
function isStaffActor(roles: string[]): boolean {
  const set = new Set(['owner', 'admin', 'manager', 'staff', 'instructor']);
  return roles.some((r) => set.has(r));
}

assert.equal(isStaffActor(['owner']), true);
assert.equal(isStaffActor(['staff']), true);
assert.equal(isStaffActor(['instructor']), true);
assert.equal(isStaffActor(['staff', 'instructor']), true);
assert.equal(isStaffActor(['member']), false);
assert.equal(isStaffActor(['customer']), false);
assert.equal(isStaffActor(['parent']), false);

async function runDbIfEnabled(): Promise<void> {
  const ctx = await resolveDbItContext();
  if (ctx.mode === 'dry-run') {
    console.log(`[retail-staff-sale-perm] dry-run — ${ctx.reason}`);
    console.log('  static contracts ok; live RPC gate checks skipped');
    return;
  }

  // owner(admin) 판매 가능
  const fx = await seedCommerceFixture(ctx, { stock: 5 });
  try {
    const { error: okErr } = await core(ctx.acting).rpc('create_sale', {
      p_organization_id: fx.organizationId,
      p_customer_id: null,
      p_payment_method: 'cash',
      p_points_used: 0,
      p_items: [saleLine(fx.productId, 1)],
    });
    assert.ok(!okErr, okErr?.message);

    // apply_stock_movement(inbound) 는 admin — owner는 성공해야 함
    const { error: inboundErr } = await core(ctx.acting).rpc('apply_stock_movement', {
      p_organization_id: fx.organizationId,
      p_product_id: fx.productId,
      p_variant_id: null,
      p_movement_type: 'inbound',
      p_quantity: 1,
      p_reference_type: null,
      p_reference_id: null,
      p_reason: null,
    });
    assert.ok(!inboundErr, inboundErr?.message);

    // acting으로 is_org_staff_actor 호출
    const { data: actorOk, error: actorErr } = await core(ctx.acting).rpc('is_org_staff_actor', {
      p_org_id: fx.organizationId,
    });
    assert.ok(!actorErr, actorErr?.message);
    assert.equal(actorOk, true);

    console.log('[retail-staff-sale-perm] DB smoke (owner path) ok');
  } finally {
    await fx.cleanup();
  }
}

await runDbIfEnabled();
console.log('retailStaffSalePermissions.test.ts: ok');
