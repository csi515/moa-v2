export type DayStatus = 'unchecked' | 'present' | 'absent' | 'late';

export interface PianoTimelineGroup<T> {
  timeKey: string;
  timeLabel: string;
  isUnscheduled: boolean;
  isCurrentSlot: boolean;
  items: T[];
  totalCount: number;
  uncheckedCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  isAllCompleted: boolean;
}

export function isSlotCurrent(
  timeKey: string,
  isTodayDate: boolean,
  nowMinutes?: number
): boolean {
  if (!isTodayDate || timeKey === 'unscheduled') return false;
  const minutes =
    nowMinutes !== undefined
      ? nowMinutes
      : new Date().getHours() * 60 + new Date().getMinutes();

  const [hStr, mStr] = timeKey.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return false;

  const slotMinutes = h * 60 + m;
  // 수업 시작 10분 전부터 50분 후까지 "현재 시간대"로 활성화
  return minutes >= slotMinutes - 10 && minutes < slotMinutes + 50;
}

export function groupAttendanceRowsByTime<
  T extends {
    scheduleTime?: string;
    status: DayStatus;
    student: { name: string };
  }
>(
  rows: T[],
  options?: { isToday?: boolean; nowMinutes?: number }
): PianoTimelineGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const rawTime = row.scheduleTime?.trim();
    const key = rawTime ? rawTime : 'unscheduled';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(row);
  }

  // 시간대 정렬: '13:00' -> '14:00' -> 'unscheduled'는 맨 뒤
  const sortedKeys = Array.from(map.keys()).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });

  const isTodayDate = options?.isToday ?? false;
  const nowMinutes = options?.nowMinutes;

  return sortedKeys.map((key) => {
    const groupItems = map.get(key)!;
    // 그룹 내 정렬: 미등원 최우선, 그 다음 이름 가나다순
    const sortedItems = [...groupItems].sort((a, b) => {
      const aRank = a.status === 'unchecked' ? 0 : 1;
      const bRank = b.status === 'unchecked' ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return a.student.name.localeCompare(b.student.name, 'ko');
    });

    const totalCount = sortedItems.length;
    let uncheckedCount = 0;
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    for (const item of sortedItems) {
      if (item.status === 'unchecked') uncheckedCount++;
      else if (item.status === 'present') presentCount++;
      else if (item.status === 'late') lateCount++;
      else if (item.status === 'absent') absentCount++;
    }

    return {
      timeKey: key,
      timeLabel: key === 'unscheduled' ? '일정 외' : key,
      isUnscheduled: key === 'unscheduled',
      isCurrentSlot: isSlotCurrent(key, isTodayDate, nowMinutes),
      items: sortedItems,
      totalCount,
      uncheckedCount,
      presentCount,
      lateCount,
      absentCount,
      isAllCompleted: totalCount > 0 && uncheckedCount === 0,
    };
  });
}
