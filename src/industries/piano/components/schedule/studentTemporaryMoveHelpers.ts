/**
 * Student Temporary Timetable Move & Makeup Helpers
 *
 * 정규 시간표는 그대로 보존하면서, 학생의 질병/경조사/학교 행사 등으로 인해
 * "이번 주 하루만" 다른 요일/시간대로 보강 및 임시 이동한 내역을 추적하는 헬퍼.
 */

import type { DayOfWeek } from '@/core/staff/workWindow';

export interface TemporaryMoveRecord {
  id: string;
  studentId: string;
  studentName: string;
  originalDay: DayOfWeek;
  originalStartTime: string;
  targetDay: DayOfWeek;
  targetStartTime: string;
  weekStartDate: string; // ISO yyyy-mm-dd
  createdAt: string;
  memo?: string;
}

export const STORAGE_KEY_TEMPORARY_MOVES = 'moa_piano_temporary_moves';

/**
 * 이번 주 임시 보강/이동 레코드 추가
 */
export function createTemporaryMoveRecord(params: {
  studentId: string;
  studentName: string;
  originalDay: DayOfWeek;
  originalStartTime: string;
  targetDay: DayOfWeek;
  targetStartTime: string;
  weekStartDate?: string;
  memo?: string;
}): TemporaryMoveRecord {
  const weekStart = params.weekStartDate || new Date().toISOString().slice(0, 10);
  return {
    id: `temp_move_${params.studentId}_${Date.now()}`,
    studentId: params.studentId,
    studentName: params.studentName,
    originalDay: params.originalDay,
    originalStartTime: params.originalStartTime,
    targetDay: params.targetDay,
    targetStartTime: params.targetStartTime,
    weekStartDate: weekStart,
    createdAt: new Date().toISOString(),
    memo: params.memo,
  };
}

/**
 * 로컬스토리지에서 임시 이동 목록 조회
 */
export function loadTemporaryMoves(storageKey = STORAGE_KEY_TEMPORARY_MOVES): TemporaryMoveRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 임시 이동 목록 저장
 */
export function saveTemporaryMove(
  record: TemporaryMoveRecord,
  storageKey = STORAGE_KEY_TEMPORARY_MOVES
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = loadTemporaryMoves(storageKey);
    // 동일 학생 동일 주차 기존 이동 제거 후 추가
    const filtered = list.filter(
      (r) => !(r.studentId === record.studentId && r.weekStartDate === record.weekStartDate)
    );
    filtered.push(record);
    window.localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/**
 * 특정 슬롯이 임시 보강 이동된 슬롯인지 판별
 */
export function findTemporaryMoveForSlot(
  moves: TemporaryMoveRecord[],
  studentId: string,
  day: DayOfWeek,
  startTime: string
): TemporaryMoveRecord | undefined {
  return moves.find(
    (m) => m.studentId === studentId && m.targetDay === day && m.targetStartTime === startTime
  );
}
