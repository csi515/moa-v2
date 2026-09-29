/**
 * 예약 상태 + 이용권 원자 RPC 계약·멱등·롤백 모델 단위 테스트
 * 실행: npm run test:booking-pass-atomic
 *
 * 실제 DB TX는 core.update_booking_status_with_pass(FOR UPDATE)가 담당.
 */
import assert from 'node:assert/strict';
import { mapBookingPassRpcError } from './mapBookingPassRpcError';
import { planBookingPassTransition } from './bookingStatusTransition';
import {
  applyConsumeToPassList,
  applyRefundToPassList,
  hasNonCancelledPassEntitlement,
} from './sessionPassRules';
import { applyLocalBookingPassChange } from './bookingPassLocalApply';
import { isPassUsable } from './sessionPassUtils';
import type { Booking, SessionPass } from '@/core/types/schedule';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectPassIdsToRefresh,
  mergeSessionPasses,
  patchBookingInList,
  runOnlineBookingPassUpdate,
} from './bookingPassAtomicMirror';

type PassState = { used: number; status: string };
type BookingState = { status: string; passId: string | null };

/**
 * RPC 원자성 모델:
 * shortfall이면 booking/pass 모두 미반영.
 * EXCEPTION이면 전체 rollback.
 */
function modelAtomicStatusChange(input: {
  booking: BookingState;
  pass: PassState | null;
  hasEntitlement: boolean;
  newStatus: string;
  consumeOnNoShow?: boolean;
  failMidway?: boolean;
}): { booking: BookingState; pass: PassState | null; ok: boolean; action: string } {
  const deducting =
    input.newStatus === 'completed' ||
    (input.consumeOnNoShow === true && input.newStatus === 'no_show');
  const wasDeducting =
    input.booking.status === 'completed' ||
    (input.booking.status === 'no_show' && Boolean(input.booking.passId));

  if (input.booking.status === input.newStatus) {
    return { booking: input.booking, pass: input.pass, ok: true, action: 'idempotent' };
  }

  let booking = { ...input.booking };
  let pass = input.pass ? { ...input.pass } : null;
  let action = 'none';

  if (deducting && !wasDeducting && !booking.passId) {
    if (!pass || pass.status !== 'active' || pass.used >= 10) {
      if (input.hasEntitlement) {
        return { booking: input.booking, pass: input.pass, ok: false, action: 'blocked' };
      }
      booking = { ...booking, status: input.newStatus };
      return { booking, pass, ok: true, action: 'none' };
    }
    if (input.failMidway) {
      return { booking: input.booking, pass: input.pass, ok: false, action: 'rollback' };
    }
    pass = {
      used: pass.used + 1,
      status: pass.used + 1 >= 10 ? 'exhausted' : 'active',
    };
    booking = { status: input.newStatus, passId: 'p1' };
    action = 'consume';
  } else if (wasDeducting && !deducting && booking.passId) {
    if (input.failMidway) {
      return { booking: input.booking, pass: input.pass, ok: false, action: 'rollback' };
    }
    if (!pass || pass.status === 'cancelled') {
      return { booking: input.booking, pass: input.pass, ok: false, action: 'refund_blocked' };
    }
    const used = Math.max(0, pass.used - 1);
    pass = { used, status: used >= 10 ? 'exhausted' : 'active' };
    booking = { status: input.newStatus, passId: null };
    action = 'refund';
  } else {
    booking = { ...booking, status: input.newStatus };
    action = 'keep';
  }

  return { booking, pass, ok: true, action };
}

function simulateSerialized(
  initial: { booking: BookingState; pass: PassState },
  requests: string[]
): { finals: BookingState[]; passUsed: number } {
  let booking = { ...initial.booking };
  let pass = { ...initial.pass };
  const finals: BookingState[] = [];
  for (const status of requests) {
    const r = modelAtomicStatusChange({
      booking,
      pass,
      hasEntitlement: true,
      newStatus: status,
      consumeOnNoShow: true,
    });
    if (r.ok) {
      booking = r.booking;
      if (r.pass) pass = r.pass;
    }
    finals.push({ ...booking });
  }
  return { finals, passUsed: pass.used };
}

async function run() {
  // ── [예약/이용권] Atomicity: 정상 완료 1회 → 차감 1회 ───────────
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'scheduled', passId: null },
      pass: { used: 0, status: 'active' },
      hasEntitlement: true,
      newStatus: 'completed',
    });
    assert.equal(r.ok, true);
    assert.equal(r.action, 'consume');
    assert.equal(r.booking.status, 'completed');
    assert.equal(r.pass?.used, 1);
  }

  // ── [예약/이용권] Consistency: 이용권 부족 → 완료 실패·상태 유지 ─
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'scheduled', passId: null },
      pass: { used: 10, status: 'exhausted' },
      hasEntitlement: true,
      newStatus: 'completed',
    });
    assert.equal(r.ok, false);
    assert.equal(r.booking.status, 'scheduled');
    assert.equal(r.pass?.used, 10);
  }

  // ── [예약/이용권] Consistency: 완료 취소 1회 → 복구 1회 ─────────
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'completed', passId: 'p1' },
      pass: { used: 3, status: 'active' },
      hasEntitlement: true,
      newStatus: 'cancelled',
    });
    assert.equal(r.ok, true);
    assert.equal(r.action, 'refund');
    assert.equal(r.booking.passId, null);
    assert.equal(r.pass?.used, 2);
  }

  // no_show
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'confirmed', passId: null },
      pass: { used: 1, status: 'active' },
      hasEntitlement: true,
      newStatus: 'no_show',
      consumeOnNoShow: true,
    });
    assert.equal(r.action, 'consume');
    assert.equal(r.booking.status, 'no_show');
  }

  // ── [예약/이용권] Idempotency: 동일 완료 2회 → 추가 차감 없음 ───
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'completed', passId: 'p1' },
      pass: { used: 2, status: 'active' },
      hasEntitlement: true,
      newStatus: 'completed',
    });
    assert.equal(r.action, 'idempotent');
    assert.equal(r.pass?.used, 2);
  }

  // ── [예약/이용권] Isolation: 동시 완료 2회 → 차감 1회 ───────────
  {
    const sim = simulateSerialized(
      { booking: { status: 'scheduled', passId: null }, pass: { used: 0, status: 'active' } },
      ['completed', 'completed']
    );
    assert.equal(sim.passUsed, 1);
    assert.equal(sim.finals[1].status, 'completed');
  }

  // ── [예약/이용권] Atomicity: 중간 실패 → 전체 rollback ──────────
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'scheduled', passId: null },
      pass: { used: 0, status: 'active' },
      hasEntitlement: true,
      newStatus: 'completed',
      failMidway: true,
    });
    assert.equal(r.ok, false);
    assert.equal(r.action, 'rollback');
    assert.equal(r.booking.status, 'scheduled');
    assert.equal(r.pass?.used, 0);
  }

  // org mismatch / errors mapping
  {
    assert.equal(mapBookingPassRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');
    assert.equal(mapBookingPassRpcError({ message: 'Insufficient session pass' }).code, 'insufficient_pass');
    assert.equal(mapBookingPassRpcError({ message: 'Booking not found' }).code, 'not_found');
    assert.equal(mapBookingPassRpcError({ message: 'Permission denied' }).code, 'permission');
    assert.equal(mapBookingPassRpcError({ message: 'Session pass refund failed' }).code, 'refund_failed');
  }

  // local refund 실패 → booking 변경 실패
  {
    const booking: Booking = {
      id: 'b-local',
      customerId: 'c1',
      customerName: 'A',
      startsAt: '2026-09-22T10:00:00',
      endsAt: '2026-09-22T11:00:00',
      status: 'completed',
      sessionPassId: 'p1',
    };
    const next = applyLocalBookingPassChange(booking, 'cancelled', {
      consume: () => null,
      refund: () => false,
      hasEntitlement: () => true,
    });
    assert.equal(next, null);
    assert.equal(booking.status, 'completed');
    assert.equal(booking.sessionPassId, 'p1');
  }

  // cancelled pass refund 실패
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'completed', passId: 'p1' },
      pass: { used: 3, status: 'cancelled' },
      hasEntitlement: true,
      newStatus: 'cancelled',
    });
    assert.equal(r.ok, false);
    assert.equal(r.action, 'refund_blocked');
    assert.equal(r.booking.status, 'completed');
    assert.equal(r.booking.passId, 'p1');
    assert.equal(r.pass?.used, 3);
    const cancelledList = applyRefundToPassList(
      [
        {
          id: 'p1',
          customerId: 'c1',
          customerName: 'A',
          label: '10회',
          totalSessions: 10,
          usedSessions: 3,
          status: 'cancelled',
          purchasedAt: '2026-01-01',
        },
      ],
      'p1'
    );
    assert.equal(cancelledList.ok, false);
  }

  // expired / exhausted consume 실패
  {
    const expired: SessionPass = {
      id: 'p-exp',
      customerId: 'c1',
      customerName: 'A',
      label: '10회',
      totalSessions: 10,
      usedSessions: 0,
      status: 'active',
      purchasedAt: '2026-01-01',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };
    const exhausted: SessionPass = {
      ...expired,
      id: 'p-exh',
      usedSessions: 10,
      status: 'exhausted',
      expiresAt: undefined,
    };
    assert.equal(isPassUsable(expired, new Date('2026-09-24')), false);
    assert.equal(applyConsumeToPassList([expired], 'c1'), null);
    assert.equal(applyConsumeToPassList([exhausted], 'c1'), null);
    const booking: Booking = {
      id: 'b-exp',
      customerId: 'c1',
      customerName: 'A',
      startsAt: '2026-09-22T10:00:00',
      endsAt: '2026-09-22T11:00:00',
      status: 'scheduled',
    };
    const blocked = applyLocalBookingPassChange(booking, 'completed', {
      consume: () => null,
      refund: () => true,
      hasEntitlement: () => true,
    });
    assert.equal(blocked, null);
    assert.equal(booking.status, 'scheduled');
  }

  // concurrent consume: 잔여 1회를 두 요청이 직렬화하면 1회만 차감
  {
    let pass: SessionPass = {
      id: 'p-race',
      customerId: 'c1',
      customerName: 'A',
      label: '1회',
      totalSessions: 1,
      usedSessions: 0,
      status: 'active',
      purchasedAt: '2026-01-01',
    };
    const first = applyConsumeToPassList([pass], 'c1');
    assert.ok(first);
    pass = first!.list[0];
    const second = applyConsumeToPassList([pass], 'c1');
    assert.equal(second, null);
    assert.equal(pass.usedSessions, 1);
    assert.equal(pass.status, 'exhausted');
  }

  // idempotency regression
  {
    const r = modelAtomicStatusChange({
      booking: { status: 'completed', passId: 'p1' },
      pass: { used: 2, status: 'active' },
      hasEntitlement: true,
      newStatus: 'completed',
    });
    assert.equal(r.action, 'idempotent');
    assert.equal(r.pass?.used, 2);
    assert.equal(r.booking.passId, 'p1');
  }

  // pure list ops still consistent with plan
  {
    const passes: SessionPass[] = [
      {
        id: 'p1',
        customerId: 'c1',
        customerName: 'A',
        label: '10회',
        totalSessions: 10,
        usedSessions: 9,
        status: 'active',
        purchasedAt: '2026-01-01',
      },
    ];
    assert.equal(hasNonCancelledPassEntitlement(passes, 'c1'), true);
    const consumed = applyConsumeToPassList(passes, 'c1');
    assert.ok(consumed);
    const refunded = applyRefundToPassList(consumed!.list, 'p1');
    assert.equal(refunded.list[0].usedSessions, 9);

    const booking = {
      id: 'b1',
      customerId: 'c1',
      customerName: 'A',
      startsAt: '2026-09-22T10:00:00',
      endsAt: '2026-09-22T11:00:00',
      status: 'scheduled',
    } as Booking;
    assert.equal(planBookingPassTransition(booking, 'completed').action, 'consume');
  }

  const bookingA: Booking = {
    id: 'bk-a',
    customerId: 'c1',
    customerName: 'A',
    startsAt: '2026-09-22T10:00:00',
    endsAt: '2026-09-22T11:00:00',
    status: 'scheduled',
  };
  const bookingFromDeviceB: Booking = {
    id: 'bk-b',
    customerId: 'c2',
    customerName: 'B',
    startsAt: '2026-09-22T12:00:00',
    endsAt: '2026-09-22T13:00:00',
    status: 'confirmed',
  };
  const passA: SessionPass = {
    id: 'p1',
    customerId: 'c1',
    customerName: 'A',
    label: '10회',
    totalSessions: 10,
    usedSessions: 0,
    status: 'active',
    purchasedAt: '2026-01-01',
  };
  const passFromDeviceB: SessionPass = {
    id: 'p-remote',
    customerId: 'c2',
    customerName: 'B',
    label: '20회',
    totalSessions: 20,
    usedSessions: 1,
    status: 'active',
    purchasedAt: '2026-01-02',
  };

  // ── orchestration: flushPersist(SCHEDULES/SESSION_PASSES) 미호출 ──
  {
    let flushPersistCalls = 0;
    const flushPersist = async () => {
      flushPersistCalls += 1;
      return true;
    };

    await runOnlineBookingPassUpdate(bookingA, 'completed', {
      rpc: async () => ({
        data: { action: 'consume', status: 'completed', session_pass_id: 'p1' },
        error: null,
      }),
      writeBookingMirror: (payload) =>
        patchBookingInList([bookingA], bookingA, payload).booking,
      refreshPassMirror: async () => undefined,
    });

    void flushPersist;
    assert.equal(flushPersistCalls, 0);
  }

  // ── orchestration: RPC 성공 후 booking mirror 갱신 ─────────────
  {
    const localBookings = [bookingA, bookingFromDeviceB];
    const saved = await runOnlineBookingPassUpdate(bookingA, 'completed', {
      rpc: async () => ({
        data: { action: 'consume', status: 'completed', session_pass_id: 'p1' },
        error: null,
      }),
      writeBookingMirror: (payload) => {
        const patched = patchBookingInList(localBookings, bookingA, payload);
        localBookings.splice(0, localBookings.length, ...patched.list);
        return patched.booking;
      },
      refreshPassMirror: async () => undefined,
    });

    assert.equal(saved?.status, 'completed');
    assert.equal(saved?.sessionPassId, 'p1');
    assert.equal(localBookings[0].status, 'completed');
    assert.equal(localBookings[1].id, 'bk-b');
    assert.equal(localBookings[1].status, 'confirmed');
  }

  // ── orchestration: session pass mirror 갱신, 다른 기기 이용권 유지 ─
  {
    const localPasses = [passA, passFromDeviceB];
    let refreshedIds: string[] = [];

    await runOnlineBookingPassUpdate(bookingA, 'completed', {
      rpc: async () => ({
        data: { action: 'consume', status: 'completed', session_pass_id: 'p1' },
        error: null,
      }),
      writeBookingMirror: (payload) =>
        patchBookingInList([bookingA], bookingA, payload).booking,
      refreshPassMirror: async (passIds) => {
        refreshedIds = passIds;
        const incoming: SessionPass[] = [
          { ...passA, usedSessions: 1 },
        ];
        const merged = mergeSessionPasses(localPasses, incoming);
        localPasses.splice(0, localPasses.length, ...merged);
      },
    });

    assert.deepEqual(refreshedIds, collectPassIdsToRefresh(bookingA, { session_pass_id: 'p1' }));
    assert.equal(localPasses[0].usedSessions, 1);
    assert.equal(localPasses[1].id, 'p-remote');
    assert.equal(localPasses.length, 2);
  }

  // ── orchestration: RPC 실패 시 local booking 성공 상태로 안 바뀜 ─
  {
    const localBookings = [{ ...bookingA }];
    let mirrorWrites = 0;
    let passRefreshCalls = 0;

    const failed = await runOnlineBookingPassUpdate(bookingA, 'completed', {
      rpc: async () => ({
        data: null,
        error: { message: 'Insufficient session pass' },
      }),
      writeBookingMirror: () => {
        mirrorWrites += 1;
        throw new Error('RPC 실패 후 mirror를 쓰면 안 됩니다');
      },
      refreshPassMirror: async () => {
        passRefreshCalls += 1;
      },
    });

    assert.equal(failed, null);
    assert.equal(mirrorWrites, 0);
    assert.equal(passRefreshCalls, 0);
    assert.equal(localBookings[0].status, 'scheduled');
    assert.equal(localBookings[0].sessionPassId, undefined);
  }

  // ── stale snapshot이 다른 예약을 지우는 경로가 없음 ─────────────
  {
    const staleLocalOnly = [bookingA];
    const remoteOnlyIds: string[] = [];
    const deleteRemote = (ids: string[]) => {
      remoteOnlyIds.push(...ids);
    };

    await runOnlineBookingPassUpdate(bookingA, 'completed', {
      rpc: async () => ({
        data: { action: 'consume', status: 'completed', session_pass_id: 'p1' },
        error: null,
      }),
      writeBookingMirror: (payload) => {
        const patched = patchBookingInList(staleLocalOnly, bookingA, payload);
        staleLocalOnly.splice(0, staleLocalOnly.length, ...patched.list);
        return patched.booking;
      },
      refreshPassMirror: async () => undefined,
    });

    void deleteRemote;
    assert.deepEqual(remoteOnlyIds, []);
    assert.equal(staleLocalOnly.length, 1);
    assert.equal(staleLocalOnly[0].id, 'bk-a');

    const here = dirname(fileURLToPath(import.meta.url));
    const atomicSource = readFileSync(join(here, 'bookingPassAtomic.ts'), 'utf8');
    assert.equal(atomicSource.includes('flushPersist'), false);
    assert.equal(atomicSource.includes('persistSchedules'), false);
    assert.equal(atomicSource.includes('upsertThenDiffDelete'), false);
    assert.equal(atomicSource.includes('persistSessionPasses'), false);
    assert.match(atomicSource, /writeLocalMirror/);
  }

  console.log('bookingPassAtomic.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
