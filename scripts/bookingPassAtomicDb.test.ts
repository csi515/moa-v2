/**
 * core.update_booking_status_with_pass — 실제 Supabase DB IT
 * 실행: npm run test:booking-pass-atomic-db
 *
 * 테스트 조직: RLS_AUDIT_ORG_A_ID (rls-org-isolation-audit와 동일).
 * 생성 행 name/title/metadata.moaItTag = MOA_IT_BP_* 만 사용하고 finally에서 삭제.
 * 기존 운영 예약/이용권은 읽기만 하고 수정하지 않는다.
 *
 * 게이트:
 *   live — URL + ANON + ORG_A/B + STAFF/OWNER/PARENT JWT
 *   로컬 시드 없음 — dry-run exit 0
 *   CI=true 이고 시드 없음 — fail (quality에서 이 스크립트를 돌리면 안 됨.
 *     security-db has_secrets 일 때만 호출)
 */
import assert from 'node:assert/strict';
import {
  callBookingPassRpc,
  core,
  readBooking,
  readPass,
  resolveBookingPassDbMode,
  rpcMessage,
  seedBookingPassFixture,
  type BookingPassLiveCtx,
} from './bookingPassAtomicDbHarness';

const verified: string[] = [];

function mark(name: string) {
  verified.push(name);
  console.log(`  PASS ${name}`);
}

async function runLive(ctx: BookingPassLiveCtx): Promise<void> {
  const fx = await seedBookingPassFixture(ctx);
  try {
    // A. scheduled → completed
    {
      const { data, error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingAId, 'completed');
      assert.ok(!error, error?.message);
      assert.equal((data as { action?: string } | null)?.action, 'consume');
      const booking = await readBooking(ctx.owner, fx.bookingAId);
      const pass = await readPass(ctx.owner, fx.passMainId);
      assert.equal(booking.status, 'completed');
      assert.equal(booking.sessionPassId, fx.passMainId);
      assert.equal(pass.used, 1);
      mark('A. scheduled → completed');
    }

    // B. completed → cancelled
    {
      const { data, error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingAId, 'cancelled');
      assert.ok(!error, error?.message);
      assert.equal((data as { action?: string } | null)?.action, 'refund');
      const booking = await readBooking(ctx.owner, fx.bookingAId);
      const pass = await readPass(ctx.owner, fx.passMainId);
      assert.equal(booking.status, 'cancelled');
      assert.equal(booking.sessionPassId, null);
      assert.equal(pass.used, 0);
      mark('B. completed → cancelled');
    }

    // G. staff 정상 호출 (A와 동일 RPC, 취소 후 다시 완료)
    {
      const { error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingAId, 'completed');
      assert.ok(!error, error?.message);
      assert.equal((await readBooking(ctx.owner, fx.bookingAId)).status, 'completed');
      assert.equal((await readPass(ctx.owner, fx.passMainId)).used, 1);
      mark('G. staff 정상 호출');
    }

    // C. completed → completed
    {
      const { data, error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingAId, 'completed');
      assert.ok(!error, error?.message);
      assert.equal((data as { action?: string } | null)?.action, 'idempotent');
      assert.equal((await readPass(ctx.owner, fx.passMainId)).used, 1);
      mark('C. completed → completed');
    }

    // D. 이용권 부족 — empty pass만 남기고 main을 소진 상태로 만들지 않음.
    // bookingD 고객은 empty+main+single을 가짐. main은 used=1이라 아직 차감 가능.
    // D 전용: main/single을 잠시 취소해 empty만 entitlement로 둔다.
    {
      const { error: holdErr } = await core(ctx.owner)
        .from('session_passes')
        .update({ status: 'cancelled' })
        .eq('id', fx.passMainId);
      assert.ok(!holdErr, holdErr?.message);
      const before = await readPass(ctx.owner, fx.passEmptyId);
      const { error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingDId, 'completed');
      assert.ok(error, 'expected insufficient');
      assert.match(rpcMessage(error), /Insufficient session pass/i);
      const booking = await readBooking(ctx.owner, fx.bookingDId);
      const empty = await readPass(ctx.owner, fx.passEmptyId);
      assert.equal(booking.status, 'scheduled');
      assert.equal(empty.used, before.used);
      const { error: restoreErr } = await core(ctx.owner)
        .from('session_passes')
        .update({ status: 'active' })
        .eq('id', fx.passMainId);
      assert.ok(!restoreErr, restoreErr?.message);
      mark('D. 이용권 부족');
    }

    // E. 조직 불일치 booking
    {
      const { error } = await callBookingPassRpc(ctx.staff, ctx.orgB, fx.bookingAId, 'completed');
      assert.ok(error, 'expected org mismatch');
      assert.match(rpcMessage(error), /Organization mismatch/i);
      assert.equal((await readBooking(ctx.owner, fx.bookingAId)).status, 'completed');
      mark('E. 조직 불일치');
    }

    // F. customer/parent가 RPC 호출
    {
      const parentRes = await callBookingPassRpc(ctx.parent, ctx.orgA, fx.bookingAId, 'cancelled');
      assert.ok(parentRes.error, 'parent should be denied');
      assert.match(rpcMessage(parentRes.error), /Permission denied/i);
      if (ctx.customer) {
        const custRes = await callBookingPassRpc(ctx.customer, ctx.orgA, fx.bookingAId, 'cancelled');
        assert.ok(custRes.error, 'customer should be denied');
        assert.match(rpcMessage(custRes.error), /Permission denied/i);
      }
      assert.equal((await readBooking(ctx.owner, fx.bookingAId)).status, 'completed');
      mark('F. customer/parent');
    }

    // H. 동시 completed 요청 2개 (독립 세션 staff + owner)
    {
      const [a, b] = await Promise.all([
        callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingHId, 'completed'),
        callBookingPassRpc(ctx.owner, ctx.orgA, fx.bookingHId, 'completed'),
      ]);
      assert.ok(!a.error || !b.error, `${a.error?.message ?? ''} ${b.error?.message ?? ''}`);
      const booking = await readBooking(ctx.owner, fx.bookingHId);
      const pass = await readPass(ctx.owner, fx.passMainId);
      assert.equal(booking.status, 'completed');
      assert.equal(booking.sessionPassId, fx.passMainId);
      assert.equal(pass.used, 2);
      mark('H. 동시 completed');
    }

    // I. 중간 실패 — remaining 1, 서로 다른 booking 동시 complete
    // 한쪽 consume 커밋, 한쪽 Insufficient exception → 패자 booking/pass 미변경
    {
      const { error: holdMain } = await core(ctx.owner)
        .from('session_passes')
        .update({ status: 'cancelled' })
        .eq('id', fx.passMainId);
      assert.ok(!holdMain, holdMain?.message);

      const passSingleId = crypto.randomUUID();
      const { error: oneErr } = await core(ctx.owner).from('session_passes').insert({
        id: passSingleId,
        organization_id: ctx.orgA,
        customer_id: fx.customerId,
        customer_name: fx.tag,
        label: `${fx.tag}_one`,
        total_sessions: 1,
        used_sessions: 0,
        status: 'active',
      });
      assert.ok(!oneErr, oneErr?.message);

      const [a, b] = await Promise.all([
        callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingI1Id, 'completed'),
        callBookingPassRpc(ctx.owner, ctx.orgA, fx.bookingI2Id, 'completed'),
      ]);
      const ok = [a, b].filter((r) => !r.error).length;
      const fail = [a, b].filter((r) => !!r.error).length;
      assert.equal(ok, 1, `expected 1 success got ${ok}`);
      assert.equal(fail, 1, `expected 1 fail got ${fail}`);
      assert.match(rpcMessage(a.error || b.error), /Insufficient session pass/i);
      const i1 = await readBooking(ctx.owner, fx.bookingI1Id);
      const i2 = await readBooking(ctx.owner, fx.bookingI2Id);
      assert.equal([i1, i2].filter((row) => row.status === 'completed').length, 1);
      const scheduled = [i1, i2].filter((row) => row.status === 'scheduled');
      assert.equal(scheduled.length, 1);
      assert.equal(scheduled[0].sessionPassId, null);
      assert.equal((await readPass(ctx.owner, passSingleId)).used, 1);
      mark('I. 중간 실패');
    }

    // J. cancelled pass refund 실패 — booking 유지
    {
      const before = await readBooking(ctx.owner, fx.bookingAId);
      const { error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingAId, 'cancelled');
      assert.ok(error, 'expected refund fail');
      assert.match(rpcMessage(error), /Session pass refund failed/i);
      const after = await readBooking(ctx.owner, fx.bookingAId);
      assert.equal(after.status, before.status);
      assert.equal(after.sessionPassId, before.sessionPassId);
      mark('J. cancelled pass refund 실패');
    }

    // K. expired pass consume 실패
    {
      const { error: expErr } = await core(ctx.owner).from('session_passes').insert({
        organization_id: ctx.orgA,
        customer_id: fx.customerId,
        customer_name: fx.tag,
        label: `${fx.tag}_exp`,
        total_sessions: 10,
        used_sessions: 0,
        status: 'active',
        expires_at: '2020-01-01T00:00:00.000Z',
      });
      assert.ok(!expErr, expErr?.message);
      const { error } = await callBookingPassRpc(ctx.staff, ctx.orgA, fx.bookingDId, 'completed');
      assert.ok(error, 'expected expired consume fail');
      assert.match(rpcMessage(error), /Insufficient session pass/i);
      assert.equal((await readBooking(ctx.owner, fx.bookingDId)).status, 'scheduled');
      mark('K. expired pass consume 실패');
    }
  } finally {
    await fx.cleanup();
  }
}

const mode = resolveBookingPassDbMode();
if (mode.mode === 'dry-run') {
  console.log(`[booking-pass-db-it] dry-run — ${mode.reason}`);
  console.log('Would verify:');
  console.log('  A. scheduled → completed');
  console.log('  B. completed → cancelled');
  console.log('  C. completed → completed');
  console.log('  D. 이용권 부족');
  console.log('  E. 조직 불일치');
  console.log('  F. customer/parent');
  console.log('  G. staff');
  console.log('  H. 동시 completed');
  console.log('  I. 중간 실패');
  console.log('  J. cancelled pass refund 실패');
  console.log('  K. expired pass consume 실패');
} else {
  await runLive(mode.ctx);
  console.log('\nDB-verified:');
  for (const name of verified) console.log(`  ✓ ${name}`);
}

console.log('bookingPassAtomicDb.test.ts: ok');
