import type { SessionPass } from '@/core/types/schedule';
import { getPassRemaining, isPassUsable, pickPassToConsume } from './sessionPassUtils';

/** 잔여 횟수·취소 여부로 이용권 status 산출 (저장 시 정규화) */
export function deriveSessionPassStatus(
  pass: Pick<SessionPass, 'status' | 'totalSessions' | 'usedSessions'>
): SessionPass['status'] {
  if (pass.status === 'cancelled') return 'cancelled';
  const remaining = Math.max(0, pass.totalSessions - pass.usedSessions);
  return remaining <= 0 ? 'exhausted' : 'active';
}

export function withDerivedSessionPassStatus<T extends SessionPass>(pass: T): T {
  return { ...pass, status: deriveSessionPassStatus(pass) };
}

/** 비취소 이용권 보유 여부(잔여 0·exhausted 포함) — 차감 실패 시 완료 차단용 */
export function hasNonCancelledPassEntitlement(
  passes: SessionPass[],
  customerId: string
): boolean {
  return passes.some((p) => p.customerId === customerId && p.status !== 'cancelled');
}

/**
 * 목록에서 이용권 1회 차감. 불변 업데이트.
 * @returns 새 목록 + 차감된 passId, 실패 시 null
 */
export function applyConsumeToPassList(
  passes: SessionPass[],
  customerId: string
): { list: SessionPass[]; passId: string } | null {
  const target = pickPassToConsume(passes, customerId);
  if (!target || !isPassUsable(target)) return null;

  const usedSessions = target.usedSessions + 1;
  const status: SessionPass['status'] =
    getPassRemaining({ ...target, usedSessions }) <= 0 ? 'exhausted' : 'active';
  const idx = passes.findIndex((p) => p.id === target.id);
  if (idx < 0) return null;

  const list = passes.slice();
  list[idx] = { ...target, usedSessions, status };
  return { list, passId: target.id };
}

/**
 * 목록에서 이용권 1회 복구. 불변 업데이트.
 */
export function applyRefundToPassList(
  passes: SessionPass[],
  passId: string
): { list: SessionPass[]; ok: boolean } {
  const idx = passes.findIndex((p) => p.id === passId);
  if (idx < 0) return { list: passes, ok: false };
  const pass = passes[idx];
  if (pass.status === 'cancelled') return { list: passes, ok: false };

  const usedSessions = Math.max(0, pass.usedSessions - 1);
  const list = passes.slice();
  list[idx] = {
    ...pass,
    usedSessions,
    status: usedSessions >= pass.totalSessions ? 'exhausted' : 'active',
  };
  return { list, ok: true };
}
