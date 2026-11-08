/**
 * Piano Recital & Competition Quick Participation Board Helpers
 *
 * 정기 연주회 및 콩쿠르 신청 기간에 원생별 참가 상태(참가/고민중/불참),
 * 참가곡명, 참가비 납부 여부를 실시간으로 1터치 취합하는 도메인 헬퍼.
 */

export type RecitalStatus = 'participating' | 'pending' | 'declined';

export interface RecitalQuickEntry {
  studentId: string;
  studentName: string;
  grade?: string;
  level?: string;
  status: RecitalStatus;
  pieceTitle: string; // 연주 참가곡명
  feePaid: boolean; // 참가비 입금 완료 여부
  updatedAt?: string;
}

export interface RecitalBoardStats {
  totalCount: number;
  participatingCount: number;
  declinedCount: number;
  pendingCount: number;
  participationRate: number; // 0 ~ 100 (%)
  feePaidCount: number;
}

export const RECITAL_STATUS_LABELS: Record<
  RecitalStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  participating: {
    label: '참가 확정',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🟢',
  },
  pending: {
    label: '고민 중 (상담 필요)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '🟡',
  },
  declined: {
    label: '불참',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: '⚪',
  },
};

export const STORAGE_KEY_RECITAL_BOARD_PREFIX = 'moa_piano_recital_quick_board_';

/**
 * 실시간 참가율 및 통계 집계
 */
export function calculateRecitalBoardStats(entries: RecitalQuickEntry[]): RecitalBoardStats {
  const totalCount = entries.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      participatingCount: 0,
      declinedCount: 0,
      pendingCount: 0,
      participationRate: 0,
      feePaidCount: 0,
    };
  }

  let participatingCount = 0;
  let declinedCount = 0;
  let pendingCount = 0;
  let feePaidCount = 0;

  for (const entry of entries) {
    if (entry.status === 'participating') {
      participatingCount += 1;
      if (entry.feePaid) feePaidCount += 1;
    } else if (entry.status === 'declined') {
      declinedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  const participationRate = Math.round((participatingCount / totalCount) * 100);

  return {
    totalCount,
    participatingCount,
    declinedCount,
    pendingCount,
    participationRate,
    feePaidCount,
  };
}

/**
 * 로컬스토리지에서 특정 행사의 원생 취합 엔트리 맵 로드
 */
export function loadRecitalStoredMap(
  eventId: string,
  prefix = STORAGE_KEY_RECITAL_BOARD_PREFIX
): Record<string, Partial<RecitalQuickEntry>> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(`${prefix}${eventId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 전체 재원생 목록과 행사 참가자 ID를 조합하여 일괄 취합 엔트리 리스트 생성
 */
export function buildRecitalQuickEntries(
  eventId: string,
  students: Array<{ id: string; name: string; grade?: string; level?: string }>,
  knownParticipantIds: string[] = [],
  prefix = STORAGE_KEY_RECITAL_BOARD_PREFIX
): RecitalQuickEntry[] {
  const stored = loadRecitalStoredMap(eventId, prefix);
  const knownSet = new Set(knownParticipantIds);

  return students.map((s) => {
    const saved = stored[s.id];

    // 저장된 상태가 있다면 우선, 없다면 행사 참가자 목록에 있으면 participating, 아니면 pending
    const status: RecitalStatus = saved?.status
      ? saved.status
      : knownSet.has(s.id)
      ? 'participating'
      : 'pending';

    return {
      studentId: s.id,
      studentName: s.name,
      grade: s.grade,
      level: s.level,
      status,
      pieceTitle: saved?.pieceTitle || '',
      feePaid: saved?.feePaid ?? false,
      updatedAt: saved?.updatedAt,
    };
  });
}

/**
 * 단일 원생의 상태/곡명/참가비 변경 사항 저장
 */
export function saveRecitalQuickEntry(
  eventId: string,
  entry: RecitalQuickEntry,
  prefix = STORAGE_KEY_RECITAL_BOARD_PREFIX
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = `${prefix}${eventId}`;
    const stored = loadRecitalStoredMap(eventId, prefix);
    stored[entry.studentId] = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

/**
 * 검색 및 필터링 유틸리티
 */
export function filterRecitalEntries(
  entries: RecitalQuickEntry[],
  filter: 'all' | RecitalStatus,
  searchQuery: string
): RecitalQuickEntry[] {
  const q = searchQuery.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filter !== 'all' && entry.status !== filter) {
      return false;
    }
    if (q) {
      const matchName = entry.studentName.toLowerCase().includes(q);
      const matchSong = entry.pieceTitle.toLowerCase().includes(q);
      const matchGrade = (entry.grade || '').toLowerCase().includes(q);
      return matchName || matchSong || matchGrade;
    }
    return true;
  });
}
