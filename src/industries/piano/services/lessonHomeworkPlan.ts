import type { AssignmentItem } from '@/types/education';

export type HomeworkSyncPlan =
  | { action: 'noop'; items: AssignmentItem[] }
  | { action: 'update'; items: AssignmentItem[]; resetParentState: boolean }
  | { action: 'append'; items: AssignmentItem[] };

/** 최신 items 위에 이번 곡만 반영. 다른 곡·부모 확인은 유지. */
export function planLessonHomeworkSync(params: {
  latestItems: AssignmentItem[];
  songTitle: string;
  homework: string;
}): HomeworkSyncPlan {
  const homework = params.homework.trim();
  if (!homework) return { action: 'noop', items: params.latestItems };

  const songTitle = params.songTitle.trim() || '수업 과제';
  const items = params.latestItems.map((it) => ({ ...it }));
  const sameSongIdx = items.findIndex(
    (it) => it.songTitle.trim().toLowerCase() === songTitle.toLowerCase()
  );

  if (sameSongIdx >= 0) {
    const prev = items[sameSongIdx];
    if (prev.instructions.trim() === homework) {
      return { action: 'noop', items };
    }
    items[sameSongIdx] = {
      ...prev,
      instructions: homework,
      parentConfirmed: false,
      completed: false,
      parentConfirmedAt: undefined,
      completedAt: undefined,
    };
    return { action: 'update', items, resetParentState: true };
  }

  items.push({
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    assignmentId: items[0]?.assignmentId || '',
    songTitle,
    instructions: homework,
    sortOrder: items.length,
    parentConfirmed: false,
    completed: false,
  });
  return { action: 'append', items };
}

/** lock 후 재평가하면 두 강사 곡이 모두 남는다 */
export function modelSerializedHomeworkSync(params: {
  baseItems: AssignmentItem[];
  first: { songTitle: string; homework: string };
  secondAfterLatest: { songTitle: string; homework: string };
}): AssignmentItem[] {
  const afterFirst = planLessonHomeworkSync({
    latestItems: params.baseItems,
    songTitle: params.first.songTitle,
    homework: params.first.homework,
  }).items;
  return planLessonHomeworkSync({
    latestItems: afterFirst,
    songTitle: params.secondAfterLatest.songTitle,
    homework: params.secondAfterLatest.homework,
  }).items;
}
