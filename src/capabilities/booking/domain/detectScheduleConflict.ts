/**
 * 동일 시간대 직원·강의실 중복 점유 판정 (순수 함수)
 * scheduling capability의 timesOverlap 규칙을 booking에서 재사용 가능한 API로 노출
 */

export type ScheduleConflictKind = 'staff' | 'room';

export interface ScheduleInterval {
  id?: string;
  staffId?: string | null;
  /** 강의실/공간 식별자 (room name 또는 space_resource_id) */
  spaceResourceId?: string | null;
  roomId?: string | null;
  room?: string | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface ScheduleConflictHit {
  kind: ScheduleConflictKind;
  withId?: string;
  withLabel: string;
  startsAt: string;
  endsAt: string;
}

function toMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** 끝점 접침은 허용 (A ends === B starts → 충돌 아님) */
export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMs(aStart) < toMs(bEnd) && toMs(bStart) < toMs(aEnd);
}

function resolveSpaceId(item: ScheduleInterval): string {
  return (item.spaceResourceId || item.roomId || item.room || '').trim();
}

/**
 * candidate 와 existing 목록 간 ① 동일 직원 ② 동일 강의실 충돌을 판정한다.
 */
export function detectScheduleConflict(
  candidate: ScheduleInterval,
  existing: ScheduleInterval[]
): ScheduleConflictHit[] {
  const hits: ScheduleConflictHit[] = [];
  const candSpace = resolveSpaceId(candidate);

  for (const item of existing) {
    if (candidate.id && item.id && candidate.id === item.id) continue;
    if (!intervalsOverlap(candidate.startsAt, candidate.endsAt, item.startsAt, item.endsAt)) {
      continue;
    }

    if (
      candidate.staffId &&
      item.staffId &&
      candidate.staffId === item.staffId
    ) {
      hits.push({
        kind: 'staff',
        withId: item.id,
        withLabel: `동일 직원 일정 (${item.startsAt.slice(11, 16)}~${item.endsAt.slice(11, 16)})`,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      });
    }

    const itemSpace = resolveSpaceId(item);
    if (candSpace && itemSpace && candSpace === itemSpace) {
      hits.push({
        kind: 'room',
        withId: item.id,
        withLabel: `강의실 사용 중 (${itemSpace})`,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      });
    }
  }

  return hits;
}

export function hasScheduleConflict(
  candidate: ScheduleInterval,
  existing: ScheduleInterval[]
): boolean {
  return detectScheduleConflict(candidate, existing).length > 0;
}
