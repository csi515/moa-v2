/**
 * Piano Practice Room Tuning & Maintenance Helpers
 *
 * 피아노 연습실별 피아노 상태(그랜드/업라이트/디지털), 정기 조율 주기(D-day),
 * 이상 건반/페달 점검 메모를 관리하는 도메인 유틸리티.
 */

export type PianoInstrumentType = 'grand' | 'upright' | 'digital';

export interface RoomTuningRecord {
  roomId: string;
  roomName: string;
  pianoType: PianoInstrumentType;
  lastTunedAt: string; // 'YYYY-MM-DD'
  tuningCycleMonths: number; // 기본 6개월 (180일)
  issueNotes?: string; // 예: "3옥타브 솔 건반 걸림"
  updatedAt?: string;
}

export const PIANO_TYPE_LABELS: Record<PianoInstrumentType, { label: string; icon: string }> = {
  grand: { label: '그랜드 피아노', icon: '🎹' },
  upright: { label: '업라이트 피아노', icon: '🎼' },
  digital: { label: '디지털 피아노', icon: '🎧' },
};

/** 자주 발생하는 건반/피아노 이상 증상 빠른 선택 칩 */
export const PIANO_ISSUE_CHIPS = [
  '건반 뻑뻑함/걸림',
  '음정 틀어짐(조율 필요)',
  '페달 잡음/삐걱거림',
  '건반 복귀 느림',
  '특정 건반 소리 먹먹함',
  '조율 핀 헐거움',
] as const;

export const STORAGE_KEY_PIANO_TUNING = 'moa_piano_room_tuning_v1';

/**
 * 다음 조율 예정일 및 남은 D-day 계산 함수
 */
export function calculateTuningDDay(
  lastTunedAt: string,
  cycleMonths: number = 6,
  todayIso: string = new Date().toISOString().slice(0, 10)
): {
  nextTuningDate: string;
  daysRemaining: number;
  status: 'good' | 'upcoming' | 'overdue';
  statusText: string;
} {
  if (!lastTunedAt) {
    return {
      nextTuningDate: todayIso,
      daysRemaining: 0,
      status: 'overdue',
      statusText: '조율 이력 없음',
    };
  }

  const lastDate = new Date(lastTunedAt);
  if (isNaN(lastDate.getTime())) {
    return {
      nextTuningDate: todayIso,
      daysRemaining: 0,
      status: 'overdue',
      statusText: '날짜 오류',
    };
  }

  // 조율 예정일 = 최근 조율일 + cycleMonths (월 가산)
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + cycleMonths);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const today = new Date(todayIso);
  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      nextTuningDate: nextDateStr,
      daysRemaining: diffDays,
      status: 'overdue',
      statusText: `조율 지연 (D+${Math.abs(diffDays)})`,
    };
  }

  if (diffDays <= 30) {
    return {
      nextTuningDate: nextDateStr,
      daysRemaining: diffDays,
      status: 'upcoming',
      statusText: `조율 임박 (D-${diffDays})`,
    };
  }

  return {
    nextTuningDate: nextDateStr,
    daysRemaining: diffDays,
    status: 'good',
    statusText: `조율 양호 (D-${diffDays})`,
  };
}

/**
 * 로컬스토리지에서 연습실별 조율 상태 맵을 로드
 */
export function loadAllRoomTuningRecords(storageKey = STORAGE_KEY_PIANO_TUNING): Record<string, RoomTuningRecord> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 단일 연습실 조율 상태 로드 (기본값 자동 보정)
 */
export function getRoomTuningRecord(
  roomId: string,
  roomName: string = '연습실',
  storageKey = STORAGE_KEY_PIANO_TUNING
): RoomTuningRecord {
  const all = loadAllRoomTuningRecords(storageKey);
  const existing = all[roomId];

  if (existing) {
    return existing;
  }

  // 기본 레코드 생성 (그랜드/업라이트 기본 매핑)
  const isGrand = roomName.includes('그랜드') || roomName.includes('1번');
  const isDigital = roomName.includes('디지털') || roomName.includes('전자');
  const defaultType: PianoInstrumentType = isGrand ? 'grand' : isDigital ? 'digital' : 'upright';

  // 기본 조율일 = 3개월 전
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  const defaultLastTuned = d.toISOString().slice(0, 10);

  return {
    roomId,
    roomName,
    pianoType: defaultType,
    lastTunedAt: defaultLastTuned,
    tuningCycleMonths: 6,
    issueNotes: '',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 연습실 조율 정보 저장
 */
export function saveRoomTuningRecord(
  record: RoomTuningRecord,
  storageKey = STORAGE_KEY_PIANO_TUNING
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const all = loadAllRoomTuningRecords(storageKey);
    all[record.roomId] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/**
 * 오늘 조율 완료 처리 (최근 조율일 갱신 및 이상 메모 리셋)
 */
export function markRoomTunedToday(
  record: RoomTuningRecord,
  todayIso: string = new Date().toISOString().slice(0, 10),
  storageKey = STORAGE_KEY_PIANO_TUNING
): RoomTuningRecord {
  const updated: RoomTuningRecord = {
    ...record,
    lastTunedAt: todayIso,
    issueNotes: '',
    updatedAt: new Date().toISOString(),
  };
  saveRoomTuningRecord(updated, storageKey);
  return updated;
}
