/**
 * Supabase DB 통합 테스트 공용 하네스.
 * - dotenv(.env.local / .env) 로드
 * - MOA_DB_INTEGRATION=1 없으면 dry-run
 * - 프로젝트 ref allowlist로 운영 DB 오실행 차단
 * - service role(fixture) + owner JWT(RPC/RLS) 클라이언트
 */
import { config as loadEnv } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

export const IT_TAG = 'MOA_IT';

export function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function core(client: SupabaseClient) {
  return client.schema('core');
}

export type DbItMode =
  | { mode: 'dry-run'; reason: string }
  | {
      mode: 'live';
      url: string;
      projectRef: string;
      organizationId: string;
      ownerUserId: string;
      admin: SupabaseClient;
      acting: SupabaseClient;
    };

function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    // xxx.supabase.co
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? host;
  } catch {
    return null;
  }
}

/**
 * 통합 테스트 실행 게이트.
 * live 실행 조건:
 *   MOA_DB_INTEGRATION=1
 *   SUPABASE_URL(+VITE_) + SERVICE_ROLE + ANON + OWNER JWT
 *   MOA_DB_IT_ALLOW_PROJECT_REFS 에 현재 project ref 포함
 */
export async function resolveDbItContext(): Promise<DbItMode> {
  const enabled = env('MOA_DB_INTEGRATION') === '1';
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const ownerJwt =
    env('MOA_DB_IT_OWNER_JWT') ||
    env('POINT_ATOMIC_OWNER_JWT') ||
    env('RLS_AUDIT_OWNER_A_JWT') ||
    env('STOCK_ATOMIC_OWNER_JWT');
  const orgHint =
    env('MOA_DB_IT_ORG_ID') ||
    env('POINT_ATOMIC_ORG_ID') ||
    env('RLS_AUDIT_ORG_A_ID') ||
    env('STOCK_ATOMIC_ORG_ID');

  if (!enabled) {
    return {
      mode: 'dry-run',
      reason:
        'MOA_DB_INTEGRATION≠1 — 실제 DB 호출 생략. live 실행: MOA_DB_INTEGRATION=1 + SERVICE_ROLE + OWNER JWT + MOA_DB_IT_ALLOW_PROJECT_REFS',
    };
  }

  if (!url || !serviceKey || !anonKey || !ownerJwt) {
    throw new Error(
      '[db-it] MOA_DB_INTEGRATION=1 이지만 자격 증명이 부족합니다. ' +
        '필요: SUPABASE_URL(or VITE_), SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY(or VITE_), MOA_DB_IT_OWNER_JWT(or RLS_AUDIT_OWNER_A_JWT)'
    );
  }

  const projectRef = projectRefFromUrl(url);
  if (!projectRef) {
    throw new Error(`[db-it] SUPABASE_URL 파싱 실패: ${url}`);
  }

  const allow = (env('MOA_DB_IT_ALLOW_PROJECT_REFS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length === 0) {
    throw new Error(
      `[db-it] 차단: MOA_DB_IT_ALLOW_PROJECT_REFS 미설정 (현재 ref=${projectRef}). ` +
        '운영 DB 오실행 방지를 위해 allowlist에 project ref를 명시하세요.'
    );
  }
  if (!allow.includes(projectRef.toLowerCase())) {
    throw new Error(
      `[db-it] 차단: project ref "${projectRef}" 가 allowlist에 없습니다. ` +
        `허용=${allow.join(',')}`
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const acting = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await acting.auth.getUser();
  if (userErr || !user?.id) {
    throw new Error(`[db-it] OWNER JWT 무효: ${userErr?.message ?? 'no user'}`);
  }

  let organizationId = orgHint;
  if (!organizationId) {
    const { data: row, error } = await core(admin)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (error || !row) {
      throw new Error(`[db-it] owner membership 조회 실패: ${error?.message ?? 'empty'}`);
    }
    organizationId = String(row.organization_id);
  }

  // JWT 사용자가 해당 org admin인지 확인
  const { data: isAdmin, error: adminErr } = await core(acting).rpc('is_org_admin', {
    org_id: organizationId,
  });
  if (adminErr) throw new Error(`[db-it] is_org_admin: ${adminErr.message}`);
  if (!isAdmin) {
    throw new Error(`[db-it] JWT 사용자가 org=${organizationId} 의 admin이 아닙니다.`);
  }

  return {
    mode: 'live',
    url,
    projectRef,
    organizationId,
    ownerUserId: user.id,
    admin,
    acting,
  };
}

export type CommerceFixture = {
  organizationId: string;
  productId: string;
  productIdB?: string;
  customerId: string;
  cleanup: () => Promise<void>;
};

/** IT 전용 product/customer/inventory 시드. 태그로 cleanup. */
export async function seedCommerceFixture(
  ctx: Extract<DbItMode, { mode: 'live' }>,
  opts?: { stock?: number; dualProduct?: boolean }
): Promise<CommerceFixture> {
  const stock = opts?.stock ?? 10;
  const stamp = `${IT_TAG}_${Date.now()}`;
  const productIds: string[] = [];
  const customerIds: string[] = [];

  const { data: product, error: pErr } = await core(ctx.admin)
    .from('products')
    .insert({
      organization_id: ctx.organizationId,
      name: stamp,
      product_code: `IT${Date.now() % 1e9}`,
      price: 10000,
      is_active: true,
    })
    .select('id')
    .single();
  if (pErr || !product) throw new Error(pErr?.message || 'product seed failed');
  productIds.push(String(product.id));

  await core(ctx.admin).from('inventory').insert({
    organization_id: ctx.organizationId,
    product_id: product.id,
    variant_id: null,
    quantity: stock,
  });

  let productIdB: string | undefined;
  if (opts?.dualProduct) {
    const { data: p2, error: p2Err } = await core(ctx.admin)
      .from('products')
      .insert({
        organization_id: ctx.organizationId,
        name: `${stamp}_B`,
        product_code: `ITB${Date.now() % 1e9}`,
        price: 5000,
        is_active: true,
      })
      .select('id')
      .single();
    if (p2Err || !p2) throw new Error(p2Err?.message || 'product B seed failed');
    productIdB = String(p2.id);
    productIds.push(productIdB);
    await core(ctx.admin).from('inventory').insert({
      organization_id: ctx.organizationId,
      product_id: p2.id,
      variant_id: null,
      quantity: stock,
    });
  }

  const { data: customer, error: cErr } = await core(ctx.admin)
    .from('customers')
    .insert({
      organization_id: ctx.organizationId,
      name: stamp,
      phone: '01000000000',
    })
    .select('id')
    .single();
  if (cErr || !customer) throw new Error(cErr?.message || 'customer seed failed');
  customerIds.push(String(customer.id));

  const cleanup = async () => {
    for (const cid of customerIds) {
      await core(ctx.admin).from('point_transactions').delete().eq('customer_id', cid);
      await core(ctx.admin).from('point_accounts').delete().eq('customer_id', cid);
    }
    // returns → sales cascade-ish: delete return items via returns, then sales
    for (const pid of productIds) {
      const { data: saleItems } = await core(ctx.admin)
        .from('sale_items')
        .select('id, sale_id')
        .eq('product_id', pid);
      const saleIds = [...new Set((saleItems ?? []).map((r) => String(r.sale_id)))];
      for (const saleId of saleIds) {
        const { data: returns } = await core(ctx.admin)
          .from('sale_returns')
          .select('id')
          .eq('sale_id', saleId);
        for (const ret of returns ?? []) {
          await core(ctx.admin).from('sale_return_items').delete().eq('sale_return_id', ret.id);
          await core(ctx.admin).from('stock_movements').delete().eq('reference_id', ret.id);
          await core(ctx.admin).from('sale_returns').delete().eq('id', ret.id);
        }
        await core(ctx.admin).from('stock_movements').delete().eq('reference_id', saleId);
        await core(ctx.admin).from('sale_items').delete().eq('sale_id', saleId);
        await core(ctx.admin).from('point_transactions').delete().eq('reference_id', saleId);
        await core(ctx.admin).from('sales').delete().eq('id', saleId);
      }
      await core(ctx.admin).from('stock_movements').delete().eq('product_id', pid);
      await core(ctx.admin).from('inventory').delete().eq('product_id', pid);
      await core(ctx.admin).from('products').delete().eq('id', pid);
    }
    for (const cid of customerIds) {
      await core(ctx.admin).from('customers').delete().eq('id', cid);
    }
  };

  return {
    organizationId: ctx.organizationId,
    productId: productIds[0],
    productIdB,
    customerId: customerIds[0],
    cleanup,
  };
}

export async function getInventoryQty(
  admin: SupabaseClient,
  organizationId: string,
  productId: string
): Promise<number> {
  const { data, error } = await core(admin)
    .from('inventory')
    .select('quantity')
    .eq('organization_id', organizationId)
    .eq('product_id', productId)
    .is('variant_id', null)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.quantity ?? 0);
}

export function saleLine(
  productId: string,
  quantity: number,
  opts?: { unitPrice?: number; discount?: number; name?: string }
) {
  return {
    product_id: productId,
    variant_id: null,
    product_name_snapshot: opts?.name ?? 'IT Product',
    quantity,
    unit_price: opts?.unitPrice ?? 10000,
    discount_amount: opts?.discount ?? 0,
  };
}
