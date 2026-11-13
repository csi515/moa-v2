/**
 * Student Temporary Timetable Move & Makeup Helpers
 *
 * 정규 시간표는 그대로 보존하면서, 학생의 질병/경조사/학교 행사 등으로 인해
 * "오늘 하루만" 또는 "특정 날짜에만" 다른 요일/시간대로 보강 및 임시 이동한 내역을 추적하는 헬퍼.
 */

import type { DayOfWeek } from '@/core/staff/workWindow';
import { todayIsoLocal } from '@/shared/utils/localDate';

export interface TemporaryMoveRecord {
  id: string;
  studentId: string;
  studentName: string;
  originalDay: DayOfWeek;
  originalStartTime: string;
  targetDay: DayOfWeek;
  targetStartTime: string;
  targetDate: string; // ISO YYYY-MM-DD (엣지 8번: 날짜 만료 누수 원천 방지 단일 진실 공급원)
  weekStartDate: string; // ISO YYYY-MM-DD
  createdAt: string;
  memo?: string;
  isSwap?: boolean; // 맞교환 여부 플래그
  // 엣지 5번: 타 강사 인수인계 데이터
  handoverNotes?: {
    latestSong?: string;
    progress?: string;
    teacherMemo?: string;
  };
  fromTeacherName?: string;
  targetTeacherName?: string;
  // 엣지 1번: 셔틀 관련 확인 여부
  shuttleChecked?: boolean;
}

export const STORAGE_KEY_TEMPORARY_MOVES = 'moa_piano_temporary_moves';

/**
 * 임시 보강/이동 레코드 생성
 */
export function createTemporaryMoveRecord(params: {
  studentId: string;
  studentName: string;
  originalDay: DayOfWeek;
  originalStartTime: string;
  targetDay: DayOfWeek;
  targetStartTime: string;
  targetDate?: string;
  weekStartDate?: string;
  memo?: string;
  isSwap?: boolean;
  handoverNotes?: {
    latestSong?: string;
    progress?: string;
    teacherMemo?: string;
  };
  fromTeacherName?: string;
  targetTeacherName?: string;
  shuttleChecked?: boolean;
}): TemporaryMoveRecord {
  const todayIso = todayIsoLocal();
  const targetDate = params.targetDate || todayIso;
  const weekStart = params.weekStartDate || targetDate;

  return {
    id: `temp_move_${params.studentId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    studentId: params.studentId,
    studentName: params.studentName,
    originalDay: params.originalDay,
    originalStartTime: params.originalStartTime,
    targetDay: params.targetDay,
    targetStartTime: params.targetStartTime,
    targetDate,
    weekStartDate: weekStart,
    createdAt: new Date().toISOString(),
    memo: params.memo,
    isSwap: params.isSwap,
    handoverNotes: params.handoverNotes,
    fromTeacherName: params.fromTeacherName,
    targetTeacherName: params.targetTeacherName,
    shuttleChecked: params.shuttleChecked,
  };
}

/**
 * 로컬스토리지에서 임시 이동 목록 조회
 */
export function loadTemporaryMoves(
  storageKey = STORAGE_KEY_TEMPORARY_MOVES
): TemporaryMoveRecord[] {
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
 * 특정 날짜에 유효한 임시 이동 목록 조회 및 만료 데이터 자동 정리 (엣지 8번)
 */
export function getActiveTemporaryMovesForDate(
  dateIso: string,
  storageKey = STORAGE_KEY_TEMPORARY_MOVES
): TemporaryMoveRecord[] {
  const list = loadTemporaryMoves(storageKey);
  // targetDate가 명시된 경우 dateIso와 일치하는 것만, 구버전(targetDate 없음)은 weekStartDate 기준 일치 여부
  const active = list.filter((m) => {
    if (m.targetDate) {
      return m.targetDate === dateIso;
    }
    return m.weekStartDate === dateIso;
  });
  return active;
}

/**
 * 임시 이동 목록 저장 (엣지 7번: 연쇄 이동 시 최초 원본 시간표 유지)
 */
export function saveTemporaryMove(
  record: TemporaryMoveRecord,
  storageKey = STORAGE_KEY_TEMPORARY_MOVES
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = loadTemporaryMoves(storageKey);

    // 동일 학생, 동일 날짜에 이미 임시 이동된 레코드가 있는지 검사 (연쇄 이동 감지)
    const existing = list.find(
      (r) =>
        r.studentId === record.studentId &&
        (r.targetDate === record.targetDate || r.weekStartDate === record.weekStartDate)
    );

    let recordToSave = record;
    if (existing) {
      // 엣지 7번: 14:00 -> 15:00 -> 16:00 연쇄 이동 시 최초의 originalStartTime/originalDay를 계속 보존
      recordToSave = {
        ...record,
        originalDay: existing.originalDay,
        originalStartTime: existing.originalStartTime,
      };
    }

    // 기존 레코드 제거 후 신규 추가
    const filtered = list.filter(
      (r) =>
        !(
          r.studentId === record.studentId &&
          (r.targetDate === record.targetDate || r.weekStartDate === record.weekStartDate)
        )
    );
    filtered.push(recordToSave);
    window.localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/**
 * 두 학생의 슬롯 맞교환 (엣지 7번: Swap)
 */
export function swapTemporaryMoves(params: {
  studentA: { id: string; name: string };
  classA: { startTime: string; day: DayOfWeek };
  studentB: { id: string; name: string };
  classB: { startTime: string; day: DayOfWeek };
  targetDate?: string;
  storageKey?: string;
}): { recordA: TemporaryMoveRecord; recordB: TemporaryMoveRecord } {
  const date = params.targetDate || todayIsoLocal();
  const recordA = createTemporaryMoveRecord({
    studentId: params.studentA.id,
    studentName: params.studentA.name,
    originalDay: params.classA.day,
    originalStartTime: params.classA.startTime,
    targetDay: params.classB.day,
    targetStartTime: params.classB.startTime,
    targetDate: date,
    memo: `${params.studentB.name} 학생과 시간 맞교환`,
    isSwap: true,
  });

  const recordB = createTemporaryMoveRecord({
    studentId: params.studentB.id,
    studentName: params.studentB.name,
    originalDay: params.classB.day,
    originalStartTime: params.classB.startTime,
    targetDay: params.classA.day,
    targetStartTime: params.classA.startTime,
    targetDate: date,
    memo: `${params.studentA.name} 학생과 시간 맞교환`,
    isSwap: true,
  });

  saveTemporaryMove(recordA, params.storageKey);
  saveTemporaryMove(recordB, params.storageKey);

  return { recordA, recordB };
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

/**
 * 임시 이동 레코드 삭제 (원복)
 */
export function deleteTemporaryMove(
  moveId: string,
  storageKey = STORAGE_KEY_TEMPORARY_MOVES
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = loadTemporaryMoves(storageKey);
    const filtered = list.filter((r) => r.id !== moveId);
    window.localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}
