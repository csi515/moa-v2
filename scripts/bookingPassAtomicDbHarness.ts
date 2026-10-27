/**
 * atomic booking RPC DB IT 공용 시드/클라이언트.
 * 테스트 조직: RLS_AUDIT_ORG_A (감사 전용 org). 생성 행만 식별·삭제.
 */
import { config as loadEnv } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });

export const BP_IT_TAG = 'MOA_IT_BP';

export function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function core(client: SupabaseClient) {
  return client.schema('core');
}

function authed(url: string, anonKey: string, jwt: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type BookingPassLiveCtx = {
  url: string;
  orgA: string;
  orgB: string;
  owner: SupabaseClient;
  staff: SupabaseClient;
  parent: SupabaseClient;
  customer: SupabaseClient | null;
};

/**
 * live: rls-audit와 동일 JWT/org 시드.
 * CI=true 이고 시드 부족 → fail (quality dry-run 위장 금지).
 * 로컬 시드 없음 → dry-run.
 */
export function resolveBookingPassDbMode():
  | { mode: 'dry-run'; reason: string }
  | { mode: 'live'; ctx: BookingPassLiveCtx } {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const orgA = env('RLS_AUDIT_ORG_A_ID');
  const orgB = env('RLS_AUDIT_ORG_B_ID');
  const staffJwt = env('RLS_AUDIT_STAFF_A_JWT');
  const ownerJwt = env('RLS_AUDIT_OWNER_A_JWT');
  const parentJwt = env('RLS_AUDIT_PARENT_JWT');
  const customerJwt = env('RLS_AUDIT_CUSTOMER_JWT');

  const ready = Boolean(url && anonKey && orgA && orgB && staffJwt && ownerJwt && parentJwt);
  if (!ready) {
    const reason =
      'RLS_AUDIT_ORG_A/B + STAFF/OWNER/PARENT JWT + SUPABASE_URL/ANON 필요 (rls-org-isolation-audit와 동일)';
    if (process.env.CI === 'true') {
      throw new Error(`[booking-pass-db-it] CI에서 live 자격 증명이 없습니다. ${reason}`);
    }
    return { mode: 'dry-run', reason };
  }

  return {
    mode: 'live',
    ctx: {
      url: url!,
      orgA: orgA!,
      orgB: orgB!,
      owner: authed(url!, anonKey!, ownerJwt!),
      staff: authed(url!, anonKey!, staffJwt!),
      parent: authed(url!, anonKey!, parentJwt!),
      customer: customerJwt ? authed(url!, anonKey!, customerJwt) : null,
    },
  };
}

export type BookingPassFixture = {
  tag: string;
  customerId: string;
  passMainId: string;
  passEmptyId: string;
  bookingAId: string;
  bookingDId: string;
  bookingHId: string;
  bookingI1Id: string;
  bookingI2Id: string;
  cleanup: () => Promise<void>;
};

function bookingRow(
  id: string,
  orgId: string,
  customerId: string,
  tag: string,
  offsetMin: number
) {
  const start = Date.now() + offsetMin * 60_000;
  return {
    id,
    organization_id: orgId,
    customer_id: customerId,
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + 3_600_000).toISOString(),
    status: 'scheduled',
    title: tag,
    is_bookable: false,
    max_capacity: 1,
    metadata: { moaItTag: BP_IT_TAG, run: tag },
  };
}

export async function seedBookingPassFixture(
  ctx: BookingPassLiveCtx
): Promise<BookingPassFixture> {
  const tag = `${BP_IT_TAG}_${Date.now()}`;
  const customerId = crypto.randomUUID();
  const passMainId = crypto.randomUUID();
  const passEmptyId = crypto.randomUUID();
  const bookingAId = crypto.randomUUID();
  const bookingDId = crypto.randomUUID();
  const bookingHId = crypto.randomUUID();
  const bookingI1Id = crypto.randomUUID();
  const bookingI2Id = crypto.randomUUID();

  const { error: custErr } = await core(ctx.owner).from('customers').insert({
    id: customerId,
    organization_id: ctx.orgA,
    name: tag,
    status: 'active',
    metadata: { moaItTag: BP_IT_TAG },
  });
  if (custErr) throw new Error(`customer seed: ${custErr.message}`);

  const passBase = {
    organization_id: ctx.orgA,
    customer_id: customerId,
    customer_name: tag,
    purchased_at: new Date().toISOString(),
  };
  const { error: passErr } = await core(ctx.owner).from('session_passes').insert([
    { ...passBase, id: passMainId, label: `${tag}_main`, total_sessions: 10, used_sessions: 0, status: 'active' },
    {
      ...passBase,
      id: passEmptyId,
      label: `${tag}_empty`,
      total_sessions: 10,
      used_sessions: 10,
      status: 'exhausted',
    },
  ]);
  if (passErr) throw new Error(`pass seed: ${passErr.message}`);

  const { error: bookErr } = await core(ctx.owner).from('schedules').insert([
    bookingRow(bookingAId, ctx.orgA, customerId, tag, 10),
    bookingRow(bookingDId, ctx.orgA, customerId, `${tag}_D`, 20),
    bookingRow(bookingHId, ctx.orgA, customerId, `${tag}_H`, 30),
    bookingRow(bookingI1Id, ctx.orgA, customerId, `${tag}_I1`, 40),
    bookingRow(bookingI2Id, ctx.orgA, customerId, `${tag}_I2`, 50),
  ]);
  if (bookErr) throw new Error(`booking seed: ${bookErr.message}`);

  const ids = [bookingAId, bookingDId, bookingHId, bookingI1Id, bookingI2Id];
  const cleanup = async () => {
    await core(ctx.owner).from('schedules').delete().in('id', ids);
    await core(ctx.owner).from('session_passes').delete().eq('customer_id', customerId);
    await core(ctx.owner).from('customers').delete().eq('id', customerId);
  };

  return {
    tag,
    customerId,
    passMainId,
    passEmptyId,
    bookingAId,
    bookingDId,
    bookingHId,
    bookingI1Id,
    bookingI2Id,
    cleanup,
  };
}

export function callBookingPassRpc(
  client: SupabaseClient,
  orgId: string,
  bookingId: string,
  status: string
) {
  return core(client).rpc('update_booking_status_with_pass', {
    p_organization_id: orgId,
    p_booking_id: bookingId,
    p_new_status: status,
    p_consume_on_no_show: false,
  });
}

export async function readBooking(client: SupabaseClient, id: string) {
  const { data, error } = await core(client)
    .from('schedules')
    .select('id, status, metadata, organization_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const meta = (data?.metadata ?? {}) as { sessionPassId?: string };
  return {
    status: String(data?.status ?? ''),
    sessionPassId: meta.sessionPassId ? String(meta.sessionPassId) : null,
    organizationId: data?.organization_id ? String(data.organization_id) : null,
  };
}

export async function readPass(client: SupabaseClient, id: string) {
  const { data, error } = await core(client)
    .from('session_passes')
    .select('id, used_sessions, status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    used: Number(data?.used_sessions ?? 0),
    status: String(data?.status ?? ''),
  };
}

export function rpcMessage(error: { message?: string } | null): string {
  return error?.message || '';
}
