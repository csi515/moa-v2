import type { BathVisitStatus } from '../types/visit';

export type VisitCheckInDecision =
  | { ok: true; action: 'create' }
  | { ok: true; action: 'idempotent' };

export type VisitCloseDecision =
  | { ok: true; action: 'checked_out' | 'idempotent' }
  | { ok: false; reason: 'not_open' };

export type VisitCancelDecision =
  | { ok: true; action: 'cancelled' | 'idempotent' }
  | { ok: false; reason: 'not_cancellable' };

/** 열린 방문이 있으면 재입장하지 않고 멱등 */
export function evaluateVisitCheckIn(hasOpenVisit: boolean): VisitCheckInDecision {
  if (hasOpenVisit) return { ok: true, action: 'idempotent' };
  return { ok: true, action: 'create' };
}

export function evaluateVisitCheckOut(status: BathVisitStatus): VisitCloseDecision {
  if (status === 'checked_out') return { ok: true, action: 'idempotent' };
  if (status !== 'checked_in') return { ok: false, reason: 'not_open' };
  return { ok: true, action: 'checked_out' };
}

export function evaluateVisitCancel(status: BathVisitStatus): VisitCancelDecision {
  if (status === 'cancelled') return { ok: true, action: 'idempotent' };
  if (status !== 'checked_in') return { ok: false, reason: 'not_cancellable' };
  return { ok: true, action: 'cancelled' };
}
