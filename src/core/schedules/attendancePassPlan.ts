/**
 * 출결 상태 ↔ 이용권 차감 계획 (순수).
 * Piano 등원/레슨 공통. RPC와 local 경로가 같은 규칙을 쓴다.
 */
export const ATTENDANCE_PASS_COUNTABLE = [
  'present',
  'late',
  'early_leave',
  'make_up',
] as const;

export type AttendancePassStatus = (typeof ATTENDANCE_PASS_COUNTABLE)[number] | string;

export function countsTowardAttendancePass(status: AttendancePassStatus | null | undefined): boolean {
  return ATTENDANCE_PASS_COUNTABLE.includes(
    (status || '') as (typeof ATTENDANCE_PASS_COUNTABLE)[number]
  );
}

export type AttendancePassSibling = {
  id: string;
  status: string;
  sessionPassId?: string | null;
};

export type AttendancePassPlan =
  | { action: 'none'; sessionPassId?: string }
  | { action: 'reuse'; sessionPassId: string }
  | { action: 'consume'; sessionPassId?: undefined }
  | { action: 'refund'; sessionPassId: string }
  | { action: 'keep'; sessionPassId?: string };

export function planAttendancePassChange(params: {
  applyPass: boolean;
  previousStatus?: string | null;
  nextStatus: string;
  previousSessionPassId?: string | null;
  previousId?: string | null;
  siblings: AttendancePassSibling[];
}): AttendancePassPlan {
  if (!params.applyPass) {
    return { action: 'none', sessionPassId: undefined };
  }

  const prevCounted = countsTowardAttendancePass(params.previousStatus);
  const nextCounted = countsTowardAttendancePass(params.nextStatus);
  const currentPassId = params.previousSessionPassId || undefined;
  const excludeId = params.previousId || undefined;

  if (!prevCounted && nextCounted) {
    const sibling = params.siblings.find(
      (r) =>
        r.id !== excludeId &&
        countsTowardAttendancePass(r.status) &&
        Boolean(r.sessionPassId)
    );
    if (sibling?.sessionPassId) {
      return { action: 'reuse', sessionPassId: sibling.sessionPassId };
    }
    return { action: 'consume' };
  }

  if (prevCounted && !nextCounted && currentPassId) {
    const stillUsed = params.siblings.some(
      (r) =>
        r.id !== excludeId &&
        countsTowardAttendancePass(r.status) &&
        r.sessionPassId === currentPassId
    );
    if (stillUsed) {
      return { action: 'keep', sessionPassId: undefined };
    }
    return { action: 'refund', sessionPassId: currentPassId };
  }

  return { action: 'none', sessionPassId: currentPassId };
}

/** 동시성 모델 — lock 후 재평가하면 이중 차감이 없다 */
export function modelSerializedAttendancePass(params: {
  first: AttendancePassPlan;
  secondAfterLock: AttendancePassPlan;
}): { consumeCount: number } {
  let consumeCount = 0;
  if (params.first.action === 'consume') consumeCount += 1;
  if (params.secondAfterLock.action === 'consume') consumeCount += 1;
  return { consumeCount };
}
