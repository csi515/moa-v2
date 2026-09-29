/**
 * RLS org 격리 감사 러너
 *
 * 권한 우회·service role 사용자 테스트 없음.
 * anon key + 유저 JWT 로 PostgREST SELECT / CUD / RPC를 검증한다.
 *
 * 환경변수:
 *   SUPABASE_URL | VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 *   RLS_AUDIT_ORG_A_ID, RLS_AUDIT_ORG_B_ID
 *   RLS_AUDIT_STAFF_A_JWT, RLS_AUDIT_OWNER_A_JWT, RLS_AUDIT_PARENT_JWT
 *   RLS_AUDIT_CUSTOMER_JWT (선택 — 일반 사용자 포인트 격리 R9)
 *   RLS_AUDIT_FOREIGN_CUSTOMER_ID (선택 — R9에서 연결되지 않은 customer id)
 *
 * 시드 ID가 없으면 dry-run으로 시나리오만 출력하고 exit 0.
 * 실행: npm run test:rls-audit
 *
 * Retail / pass SELECT 정책 요약 (20260922220000 이후 — 감사만):
 *   products / product_variants → is_org_member (카탈로그)
 *   inventory / stock_movements → is_org_staff_actor
 *   sales / sale_items / returns → staff_actor OR is_my_customer/parent
 *   session_passes → staff_actor OR is_my_customer/parent
 *   point_accounts / point_transactions
 *     → is_my_customer OR has_any_org_role(owner|admin|manager|staff|instructor)
 *
 * CUD/RPC (선택 JWT):
 *   W1–W4 customer INSERT/UPDATE session_passes·sales = DENIED
 *   P1 customer → update_booking_status_with_pass = DENIED
 *   P2 customer → create_sale = DENIED
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface Scenario {
  id: string;
  title: string;
  run: () => Promise<{ ok: boolean; detail: string; skip?: boolean }>;
}

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function makeAuthedClient(jwt: string, url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function core(client: SupabaseClient) {
  return client.schema('core');
}

/** OrgB 필터 SELECT → 0행이어야 PASS */
async function assertZeroByOrg(
  client: SupabaseClient,
  table: string,
  orgB: string
): Promise<{ ok: boolean; detail: string }> {
  const { data, error } = await core(client).from(table).select('id').eq('organization_id', orgB);
  if (error) return { ok: false, detail: error.message };
  const n = data?.length ?? 0;
  return { ok: n === 0, detail: `rows=${n}` };
}

function isDenied(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42501' ||
    /row-level security|permission denied|violates row-level security|not authenticated/i.test(
      msg
    )
  );
}

async function main(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const orgA = env('RLS_AUDIT_ORG_A_ID');
  const orgB = env('RLS_AUDIT_ORG_B_ID');
  const staffJwt = env('RLS_AUDIT_STAFF_A_JWT');
  const ownerJwt = env('RLS_AUDIT_OWNER_A_JWT');
  const parentJwt = env('RLS_AUDIT_PARENT_JWT');
  const customerJwt = env('RLS_AUDIT_CUSTOMER_JWT');
  const foreignCustomerId = env('RLS_AUDIT_FOREIGN_CUSTOMER_ID');

  const scenarioTitles = [
    'S1 OrgA staff → OrgB customers = 0',
    'S2 OrgA staff → OrgB invoices = 0',
    'S3 Parent → unrelated OrgB customers = 0',
    'S4 OrgA owner → other org customers = 0',
    'R1 OrgA staff → OrgB products = 0',
    'R2 OrgA staff → OrgB product_variants (via products) = 0',
    'R3 OrgA staff → OrgB inventory = 0',
    'R4 OrgA staff → OrgB stock_movements = 0',
    'R5 OrgA staff → OrgB sales = 0',
    'R6 OrgA staff → OrgB sale_items (via sales) = 0',
    'R7 OrgA staff → OrgB point_accounts = 0',
    'R8 OrgA staff → OrgB point_transactions = 0',
    'R9 Customer → unlinked Customer points = 0',
    'R10 Customer → OrgB session_passes (other) = 0',
    'R11 Customer → OrgB inventory = 0',
    'R12 Customer → OrgB sales (other) = 0',
    'W1 Customer → INSERT session_passes = DENIED',
    'W2 Customer → UPDATE foreign session_passes = DENIED',
    'W3 Customer → INSERT sales = DENIED',
    'W4 Customer → DELETE session_passes = DENIED',
    'P1 Customer → update_booking_status_with_pass = DENIED',
    'P2 Customer → create_sale = DENIED',
  ];

  if (!url || !anonKey || !orgA || !orgB || !staffJwt || !ownerJwt || !parentJwt) {
    console.log('[rls-audit] dry-run — 시드/JWT 환경변수 미설정. 시나리오만 안내합니다.');
    for (const line of scenarioTitles) {
      console.log(`  ${line}`);
    }
    console.log('상세 SQL: supabase/tests/rls_org_isolation.sql');
    console.log('필요 env: SUPABASE_URL, SUPABASE_ANON_KEY, RLS_AUDIT_ORG_A_ID, RLS_AUDIT_ORG_B_ID,');
    console.log('         RLS_AUDIT_STAFF_A_JWT, RLS_AUDIT_OWNER_A_JWT, RLS_AUDIT_PARENT_JWT');
    console.log(
      '선택 env: RLS_AUDIT_CUSTOMER_JWT, RLS_AUDIT_FOREIGN_CUSTOMER_ID (R9–R12,W*,P*)'
    );
    console.log(
      '선택 env: RLS_AUDIT_FOREIGN_PASS_ID, RLS_AUDIT_BOOKING_ID (W2/P1)'
    );
    process.exit(0);
  }

  const staff = makeAuthedClient(staffJwt, url, anonKey);
  const owner = makeAuthedClient(ownerJwt, url, anonKey);
  const parent = makeAuthedClient(parentJwt, url, anonKey);

  const scenarios: Scenario[] = [
    {
      id: 'S1',
      title: 'OrgA staff cannot read OrgB customers',
      run: async () => assertZeroByOrg(staff, 'customers', orgB),
    },
    {
      id: 'S2',
      title: 'OrgA staff cannot read OrgB invoices',
      run: async () => assertZeroByOrg(staff, 'invoices', orgB),
    },
    {
      id: 'S3',
      title: 'Parent cannot read unrelated customers (cross-check via OrgB)',
      run: async () => assertZeroByOrg(parent, 'customers', orgB),
    },
    {
      id: 'S4',
      title: 'OrgA owner only sees own org customers',
      run: async () => {
        const { data, error } = await core(owner).from('customers').select('id, organization_id');
        if (error) return { ok: false, detail: error.message };
        const other = (data || []).filter((r) => r.organization_id !== orgA);
        return { ok: other.length === 0, detail: `other=${other.length} total=${data?.length ?? 0}` };
      },
    },

    // ----- Retail: Product / Inventory / Sale / Points -----
    {
      id: 'R1',
      title: 'OrgA staff cannot read OrgB products',
      run: async () => assertZeroByOrg(staff, 'products', orgB),
    },
    {
      id: 'R2',
      title: 'OrgA staff cannot read OrgB product_variants',
      run: async () => {
        const { data, error } = await core(staff)
          .from('product_variants')
          .select('id, products!inner(organization_id)')
          .eq('products.organization_id', orgB);
        if (error) return { ok: false, detail: error.message };
        const n = data?.length ?? 0;
        return { ok: n === 0, detail: `rows=${n}` };
      },
    },
    {
      id: 'R3',
      title: 'OrgA staff cannot read OrgB inventory',
      run: async () => assertZeroByOrg(staff, 'inventory', orgB),
    },
    {
      id: 'R4',
      title: 'OrgA staff cannot read OrgB stock_movements',
      run: async () => assertZeroByOrg(staff, 'stock_movements', orgB),
    },
    {
      id: 'R5',
      title: 'OrgA staff cannot read OrgB sales',
      run: async () => assertZeroByOrg(staff, 'sales', orgB),
    },
    {
      id: 'R6',
      title: 'OrgA staff cannot read OrgB sale_items',
      run: async () => {
        const { data, error } = await core(staff)
          .from('sale_items')
          .select('id, sales!inner(organization_id)')
          .eq('sales.organization_id', orgB);
        if (error) return { ok: false, detail: error.message };
        const n = data?.length ?? 0;
        return { ok: n === 0, detail: `rows=${n}` };
      },
    },
    {
      id: 'R7',
      title: 'OrgA staff cannot read OrgB point_accounts',
      run: async () => assertZeroByOrg(staff, 'point_accounts', orgB),
    },
    {
      id: 'R8',
      title: 'OrgA staff cannot read OrgB point_transactions',
      run: async () => assertZeroByOrg(staff, 'point_transactions', orgB),
    },
    {
      id: 'R9',
      title: 'End-user cannot read unlinked Customer retail points',
      run: async () => {
        if (!customerJwt) {
          return {
            ok: true,
            skip: true,
            detail: 'SKIP — set RLS_AUDIT_CUSTOMER_JWT (+ optional FOREIGN_CUSTOMER_ID)',
          };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);

        // 연결되지 않은 customer_id가 주어지면 그 행만, 아니면 OrgB 전체 포인트
        if (foreignCustomerId) {
          const [accounts, txs] = await Promise.all([
            core(customer)
              .from('point_accounts')
              .select('id')
              .eq('customer_id', foreignCustomerId),
            core(customer)
              .from('point_transactions')
              .select('id')
              .eq('customer_id', foreignCustomerId),
          ]);
          if (accounts.error) return { ok: false, detail: accounts.error.message };
          if (txs.error) return { ok: false, detail: txs.error.message };
          const a = accounts.data?.length ?? 0;
          const t = txs.data?.length ?? 0;
          return {
            ok: a === 0 && t === 0,
            detail: `accounts=${a} txs=${t} customer=${foreignCustomerId}`,
          };
        }

        const [accounts, txs] = await Promise.all([
          assertZeroByOrg(customer, 'point_accounts', orgB),
          assertZeroByOrg(customer, 'point_transactions', orgB),
        ]);
        if (!accounts.ok) return accounts;
        if (!txs.ok) return txs;
        return {
          ok: true,
          detail: `OrgB accounts+txs isolated (${accounts.detail}, ${txs.detail})`,
        };
      },
    },
    {
      id: 'R10',
      title: 'Customer cannot read other customers session_passes',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        if (foreignCustomerId) {
          const { data, error } = await core(customer)
            .from('session_passes')
            .select('id')
            .eq('organization_id', orgB)
            .eq('customer_id', foreignCustomerId);
          if (error) return { ok: false, detail: error.message };
          const n = data?.length ?? 0;
          return { ok: n === 0, detail: `rows=${n}` };
        }
        // OrgB 비멤버 JWT면 전체 0. OrgB 고객이면 FOREIGN_CUSTOMER_ID 필요.
        return assertZeroByOrg(customer, 'session_passes', orgB);
      },
    },
    {
      id: 'R11',
      title: 'Customer cannot read OrgB inventory',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        return assertZeroByOrg(customer, 'inventory', orgB);
      },
    },
    {
      id: 'R12',
      title: 'Customer cannot read OrgB sales (unlinked)',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        // 본인 행이 없을 때만 0 — foreignCustomerId 필터 또는 OrgB 전체 0 기대
        if (foreignCustomerId) {
          const { data, error } = await core(customer)
            .from('sales')
            .select('id')
            .eq('organization_id', orgB)
            .eq('customer_id', foreignCustomerId);
          if (error) return { ok: false, detail: error.message };
          const n = data?.length ?? 0;
          return { ok: n === 0, detail: `rows=${n}` };
        }
        return assertZeroByOrg(customer, 'sales', orgB);
      },
    },
    {
      id: 'W1',
      title: 'Customer cannot INSERT session_passes',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const cid = foreignCustomerId || '00000000-0000-4000-8000-000000000001';
        const { error } = await core(customer).from('session_passes').insert({
          organization_id: orgB,
          customer_id: cid,
          customer_name: 'rls-audit',
          label: 'audit',
          total_sessions: 1,
          used_sessions: 0,
        });
        return {
          ok: isDenied(error),
          detail: error?.message || 'INSERT unexpectedly succeeded',
        };
      },
    },
    {
      id: 'W2',
      title: 'Customer cannot UPDATE foreign session_passes',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const passId = env('RLS_AUDIT_FOREIGN_PASS_ID');
        if (!passId) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_FOREIGN_PASS_ID' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const { data, error } = await core(customer)
          .from('session_passes')
          .update({ memo: 'rls-audit-probe' })
          .eq('id', passId)
          .select('id');
        if (isDenied(error)) return { ok: true, detail: error?.message || 'RLS denied' };
        const n = data?.length ?? 0;
        return { ok: n === 0, detail: error?.message || `updated=${n}` };
      },
    },
    {
      id: 'W3',
      title: 'Customer cannot INSERT sales',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const { error } = await core(customer).from('sales').insert({
          organization_id: orgB,
          total_amount: 1,
          payment_method: 'cash',
          status: 'completed',
        });
        return {
          ok: isDenied(error),
          detail: error?.message || 'INSERT unexpectedly succeeded',
        };
      },
    },
    {
      id: 'W4',
      title: 'Customer cannot DELETE session_passes',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const passId = env('RLS_AUDIT_FOREIGN_PASS_ID');
        if (!passId) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_FOREIGN_PASS_ID' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const { data, error } = await core(customer)
          .from('session_passes')
          .delete()
          .eq('id', passId)
          .select('id');
        if (isDenied(error)) return { ok: true, detail: error?.message || 'RLS denied' };
        const n = data?.length ?? 0;
        return { ok: n === 0, detail: error?.message || `deleted=${n}` };
      },
    },
    {
      id: 'P1',
      title: 'Customer cannot call update_booking_status_with_pass',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const bookingId = env('RLS_AUDIT_BOOKING_ID');
        if (!bookingId) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_BOOKING_ID' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const { error } = await core(customer).rpc('update_booking_status_with_pass', {
          p_organization_id: orgB,
          p_booking_id: bookingId,
          p_new_status: 'completed',
          p_consume_on_no_show: false,
        });
        return {
          ok: isDenied(error),
          detail: error?.message || 'RPC unexpectedly succeeded',
        };
      },
    },
    {
      id: 'P2',
      title: 'Customer cannot call create_sale',
      run: async () => {
        if (!customerJwt) {
          return { ok: true, skip: true, detail: 'SKIP — RLS_AUDIT_CUSTOMER_JWT' };
        }
        const customer = makeAuthedClient(customerJwt, url, anonKey);
        const { error } = await core(customer).rpc('create_sale', {
          p_organization_id: orgB,
          p_customer_id: null,
          p_payment_method: 'cash',
          p_items: [],
        });
        return {
          ok: isDenied(error),
          detail: error?.message || 'RPC unexpectedly succeeded',
        };
      },
    },
  ];

  let failed = 0;
  let skipped = 0;
  for (const s of scenarios) {
    const result = await s.run();
    if (result.skip) {
      console.log(`[SKIP] ${s.id} ${s.title} (${result.detail})`);
      skipped++;
      continue;
    }
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${s.id} ${s.title} (${result.detail})`);
    if (!result.ok) failed++;
  }

  if (failed > 0) {
    console.error(`[rls-audit] ${failed} scenario(s) failed`);
    process.exit(1);
  }
  console.log(
    `[rls-audit] all scenarios passed${skipped > 0 ? ` (${skipped} skipped)` : ''}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
