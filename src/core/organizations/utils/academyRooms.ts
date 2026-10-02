import type { AcademyRoom, AcademyRoomKind, AcademySettings, ClassItem } from '@/types';

export const ACADEMY_ROOM_KIND_LABEL: Record<AcademyRoomKind, string> = {
  classroom: '강의실',
  practice: '연습실',
  treatment: '관리실',
};

export function createAcademyRoom(
  partial?: Partial<AcademyRoom> & { name?: string }
): AcademyRoom {
  return {
    id: partial?.id || crypto.randomUUID(),
    name: (partial?.name || '').trim() || '새 강의실',
    kind: partial?.kind || 'classroom',
  };
}

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
export function getAcademyRoomNames(params: {
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

export function getPracticeRoomNames(params: {
  settings?: AcademySettings | null;
  classes?: ClassItem[];
  extraRooms?: string[];
}): string[] {
  const configured = getConfiguredRooms(params.settings).filter((r) => r.kind === 'practice');
  if (configured.length > 0) {
    return Array.from(new Set(configured.map((r) => r.name)));
  }
  return getAcademyRoomNames(params);
}

export function formatAcademyRoomLabel(room: AcademyRoom): string {
  return `${room.name} (${ACADEMY_ROOM_KIND_LABEL[room.kind]})`;
}

