import type { NoticeTargetMode } from './types';

/** targetGroup 인코딩 — class:{id} / student:{id} / all */
export function encodeNoticeTarget(mode: NoticeTargetMode, id?: string): string {
  if (mode === 'all') return 'all';
  if (mode === 'class' && id) return `class:${id}`;
  if (mode === 'student' && id) return `student:${id}`;
  return 'all';
}

export type ParsedNoticeTarget = {
  mode: NoticeTargetMode | 'none';
  id?: string;
};

export function parseNoticeTarget(targetGroup?: string): ParsedNoticeTarget {
  if (!targetGroup || targetGroup === 'all') return { mode: 'all' };
  if (targetGroup.startsWith('class:')) {
    return { mode: 'class', id: targetGroup.slice('class:'.length) };
  }
  if (targetGroup.startsWith('student:')) {
    return { mode: 'student', id: targetGroup.slice('student:'.length) };
  }
  if (targetGroup.includes('전체')) return { mode: 'all' };
  // 알 수 없는 인코딩 — 전체 공개로 폴백하지 않음
  return { mode: 'none' };
}
