import type { SessionPass } from '@/core/types/schedule';

export function getPassRemaining(pass: SessionPass): number {
  return Math.max(0, pass.totalSessions - pass.usedSessions);
}

export function isPassUsable(pass: SessionPass, now = new Date()): boolean {
  if (pass.status !== 'active') return false;
  if (getPassRemaining(pass) <= 0) return false;
  if (pass.expiresAt && pass.expiresAt < now.toISOString()) return false;
  return true;
}

/** 회원별 잔여 횟수 합계 (사용 가능한 이용권만) */
export function sumRemainingSessions(passes: SessionPass[], customerId: string): number {
  return passes
    .filter((p) => p.customerId === customerId && isPassUsable(p))
    .reduce((sum, p) => sum + getPassRemaining(p), 0);
}

/** 차감할 이용권 1장 선택 (만료 임박·잔여 적은 순) */
export function pickPassToConsume(passes: SessionPass[], customerId: string): SessionPass | null {
  const usable = passes
    .filter((p) => p.customerId === customerId && isPassUsable(p))
    .sort((a, b) => {
      const expA = a.expiresAt ?? '9999';
      const expB = b.expiresAt ?? '9999';
      if (expA !== expB) return expA.localeCompare(expB);
      return getPassRemaining(a) - getPassRemaining(b);
    });
  return usable[0] ?? null;
}
