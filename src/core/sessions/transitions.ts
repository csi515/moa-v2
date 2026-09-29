import type { CustomerSessionStatus } from './types';

export type SessionStartDecision =
  | { ok: true; action: 'create' }
  | { ok: true; action: 'idempotent' };

export type SessionFinishDecision =
  | { ok: true; action: 'completed' | 'idempotent' }
  | { ok: false; reason: 'not_active' };

export type SessionCancelDecision =
  | { ok: true; action: 'cancelled' | 'idempotent' }
  | { ok: false; reason: 'not_cancellable' };

/** 활성 세션이 있으면 새로 열지 않고 멱등 */
export function evaluateSessionStart(hasActiveSession: boolean): SessionStartDecision {
  if (hasActiveSession) return { ok: true, action: 'idempotent' };
  return { ok: true, action: 'create' };
}

export function evaluateSessionFinish(status: CustomerSessionStatus): SessionFinishDecision {
  if (status === 'completed') return { ok: true, action: 'idempotent' };
  if (status !== 'active') return { ok: false, reason: 'not_active' };
  return { ok: true, action: 'completed' };
}

export function evaluateSessionCancel(status: CustomerSessionStatus): SessionCancelDecision {
  if (status === 'cancelled') return { ok: true, action: 'idempotent' };
  if (status !== 'active') return { ok: false, reason: 'not_cancellable' };
  return { ok: true, action: 'cancelled' };
}
