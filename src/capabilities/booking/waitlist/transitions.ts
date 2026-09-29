import { WAITLIST_OPEN_STATUSES } from './types';
import type { WaitlistEntry, WaitlistStatus } from './types';

export type WaitlistJoinDecision =
  | { ok: true; action: 'create' }
  | { ok: true; action: 'idempotent' };

export type WaitlistCancelDecision =
  | { ok: true; action: 'cancelled' | 'idempotent' }
  | { ok: false; reason: 'not_cancellable' };

export type WaitlistExpireDecision =
  | { ok: true; action: 'expired' | 'idempotent' }
  | { ok: false; reason: 'not_expirable' };

export type WaitlistNotifyDecision =
  | { ok: true; action: 'notified' | 'idempotent' }
  | { ok: false; reason: 'not_waiting' };

export type WaitlistAssignDecision =
  | { ok: true; action: 'assigned' | 'idempotent' }
  | { ok: false; reason: 'not_assignable' };

export function isOpenWaitlistStatus(status: WaitlistStatus): boolean {
  return (WAITLIST_OPEN_STATUSES as readonly string[]).includes(status);
}

export function evaluateWaitlistJoin(hasOpenEntry: boolean): WaitlistJoinDecision {
  if (hasOpenEntry) return { ok: true, action: 'idempotent' };
  return { ok: true, action: 'create' };
}

export function evaluateWaitlistCancel(status: WaitlistStatus): WaitlistCancelDecision {
  if (status === 'cancelled') return { ok: true, action: 'idempotent' };
  if (!isOpenWaitlistStatus(status)) return { ok: false, reason: 'not_cancellable' };
  return { ok: true, action: 'cancelled' };
}

export function evaluateWaitlistExpire(status: WaitlistStatus): WaitlistExpireDecision {
  if (status === 'expired') return { ok: true, action: 'idempotent' };
  if (!isOpenWaitlistStatus(status)) return { ok: false, reason: 'not_expirable' };
  return { ok: true, action: 'expired' };
}

export function evaluateWaitlistNotify(status: WaitlistStatus): WaitlistNotifyDecision {
  if (status === 'notified') return { ok: true, action: 'idempotent' };
  if (status !== 'waiting') return { ok: false, reason: 'not_waiting' };
  return { ok: true, action: 'notified' };
}

export function evaluateWaitlistAssign(status: WaitlistStatus): WaitlistAssignDecision {
  if (status === 'assigned') return { ok: true, action: 'idempotent' };
  if (!isOpenWaitlistStatus(status)) return { ok: false, reason: 'not_assignable' };
  return { ok: true, action: 'assigned' };
}

export function nextWaitlistPosition(openPositions: readonly number[]): number {
  if (openPositions.length === 0) return 1;
  return Math.max(...openPositions) + 1;
}

/** 열린 항목만 1부터 다시 매긴다. 앞 사람 취소 후 순번 복구. */
export function resequenceOpenEntries<T extends { position: number; status: WaitlistStatus }>(
  entries: readonly T[]
): T[] {
  const open = entries
    .filter((entry) => isOpenWaitlistStatus(entry.status))
    .slice()
    .sort((a, b) => a.position - b.position);
  return open.map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function displayPositionOf(
  entries: readonly Pick<WaitlistEntry, 'id' | 'position' | 'status'>[],
  entryId: string
): number | null {
  const ranked = resequenceOpenEntries(entries);
  const found = ranked.find((entry) => entry.id === entryId);
  return found ? found.position : null;
}

/** 빈자리 1석. 동시에 두 명이 같은 사람을 가져가지 않도록 맨 앞 1명만. */
export function pickNextForVacancy<T extends { position: number; status: WaitlistStatus }>(
  entries: readonly T[]
): T | null {
  const open = resequenceOpenEntries(entries);
  return open[0] ?? null;
}

/** 같은 빈자리에 대한 연속 claim. 두 번째 호출은 다음 순번 또는 없음. */
export function claimVacancySequentially<T extends { position: number; status: WaitlistStatus }>(
  entries: readonly T[]
): { first: T | null; second: T | null } {
  const open = resequenceOpenEntries(entries);
  const first = open[0];
  if (!first) return { first: null, second: null };
  return {
    first: { ...first, status: 'assigned' },
    second: open[1] ?? null,
  };
}
