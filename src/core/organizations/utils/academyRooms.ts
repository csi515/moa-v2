import type { AcademyRoom, AcademyRoomKind, AcademySettings } from '@/core/organizations/settingsTypes';
import type { ClassItem } from '@/types/classItem';

export const ROOM_KIND_LABEL: Record<AcademyRoomKind, string> = {
  classroom: '강의실',
  practice: '연습실',
  treatment: '관리실',
};

/** @deprecated Use ROOM_KIND_LABEL */
export const ACADEMY_ROOM_KIND_LABEL = ROOM_KIND_LABEL;

export function createRoom(
  partial?: Partial<AcademyRoom> & { name?: string }
): AcademyRoom {
  return {
    id: partial?.id || crypto.randomUUID(),
    name: (partial?.name || '').trim() || '새 강의실',
    kind: partial?.kind || 'classroom',
  };
}

/** @deprecated Use createRoom */
export const createAcademyRoom = createRoom;

/** 설정에 등록된 실 목록 (비어 있으면 빈 배열) */
export function getConfiguredRooms(
  settings?: Pick<AcademySettings, 'rooms'> | AcademySettings | null
): AcademyRoom[] {
  const list = settings?.rooms || [];
  return list
    .map((r): AcademyRoom => ({
      id: r.id || crypto.randomUUID(),
      name: r.name.trim(),
      kind: (r.kind === 'practice' || r.kind === 'treatment' ? r.kind : 'classroom') as AcademyRoomKind,
    }))
    .filter((r) => r.name.length > 0);
}

/**
 * 반 개설·보강용 실 이름 목록.
 * 설정 rooms 우선, 없으면 기존 반/보강 문자열에서 유도.
 */
export function getRoomNames(params: {
  settings?: AcademySettings | null;
  classes?: ClassItem[];
  extraRooms?: string[];
}): string[] {
  const configured = getConfiguredRooms(params.settings).map((r) => r.name);
  if (configured.length > 0) {
    return Array.from(new Set(configured));
  }

  const fromClasses = (params.classes || []).map((c) => c.room).filter(Boolean);
  const extras = (params.extraRooms || []).filter(Boolean);
  return Array.from(new Set([...fromClasses, ...extras]));
}

/** @deprecated Use getRoomNames */
export const getAcademyRoomNames = getRoomNames;

export function getPracticeRoomNames(params: {
  settings?: AcademySettings | null;
  classes?: ClassItem[];
  extraRooms?: string[];
  filterKind?: AcademyRoomKind | 'all';
}): string[] {
  const allConfigured = getConfiguredRooms(params.settings);
  if (allConfigured.length > 0) {
    if (params.filterKind && params.filterKind !== 'all') {
      const filtered = allConfigured.filter((r) => r.kind === params.filterKind);
      if (filtered.length > 0) {
        return Array.from(new Set(filtered.map((r) => r.name)));
      }
    }
    // 기본값: 강의실, 연습실 등 구분 없이 사업장에 등록된 모든 공간을 누락 없이 반환
    return Array.from(new Set(allConfigured.map((r) => r.name)));
  }
  return getRoomNames(params);
}

export function formatRoomLabel(room: AcademyRoom): string {
  return `${room.name} (${ROOM_KIND_LABEL[room.kind]})`;
}

/** @deprecated Use formatRoomLabel */
export const formatAcademyRoomLabel = formatRoomLabel;


