/**
 * Piano Timetable Capacity & Room Gauge Helpers
 *
 * 피아노 학원의 보유 연습실/피아노 대수 대비 시간대별 수강생 배정 인원을
 * 실시간으로 집계하여 정원 초과(Overflow) 및 여유 슬롯을 직관적으로 시각화하는 헬퍼.
 */

import type { DayOfWeek } from '@/core/staff/workWindow';

export type CapacityLevel = 'available' | 'full' | 'overflow';

export interface SlotCapacityInfo {
  day: DayOfWeek;
  startTime: string;
  studentCount: number;
  totalCapacity: number;
  percentage: number;
  level: CapacityLevel;
  badgeLabel: string;
  toneClass: string; // Tailwind 클래스
}

/**
 * 단일 슬롯의 정원 대비 인원 및 상태 판별
 */
export function calculateSlotCapacity(
  day: DayOfWeek,
  startTime: string,
  studentCount: number,
  totalCapacity: number = 5 // 기본 보유 피아노 5대
): SlotCapacityInfo {
  const cap = Math.max(1, totalCapacity);
  const percentage = Math.round((studentCount / cap) * 100);

  let level: CapacityLevel = 'available';
  let badgeLabel = `${studentCount}/${cap}명`;
  let toneClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (studentCount > cap) {
    level = 'overflow';
    badgeLabel = `${studentCount}/${cap}명 초과!`;
    toneClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
  } else if (studentCount === cap) {
    level = 'full';
    badgeLabel = `${studentCount}/${cap}명 마감`;
    toneClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return {
    day,
    startTime,
    studentCount,
    totalCapacity: cap,
    percentage,
    level,
    badgeLabel,
    toneClass,
  };
}

/**
 * 특정 요일의 시간대별 배정 현황 요약
 */
export function summarizeDayCapacity(
  capacities: SlotCapacityInfo[]
): {
  totalStudents: number;
  overflowSlotCount: number;
  fullSlotCount: number;
  availableSlotCount: number;
} {
  let totalStudents = 0;
  let overflowSlotCount = 0;
  let fullSlotCount = 0;
  let availableSlotCount = 0;

  for (const c of capacities) {
    totalStudents += c.studentCount;
    if (c.level === 'overflow') overflowSlotCount += 1;
    else if (c.level === 'full') fullSlotCount += 1;
    else availableSlotCount += 1;
  }

  return {
    totalStudents,
    overflowSlotCount,
    fullSlotCount,
    availableSlotCount,
  };
}
