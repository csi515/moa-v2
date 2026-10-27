import { StorageService } from '@/services/storage';
import { todayIsoLocal } from '@/shared/utils/localDate';

/**
 * 레슨 곡·다음 곡을 커리큘럼 진도에 반영합니다.
 * - 현재 곡: completed (이미 completed면 no-op)
 * - 다음 곡: in_progress (없으면 생성, 이미 completed/in_progress면 건너뜀)
 */
export function syncLessonCurriculumProgress(params: {
  studentId: string;
  songTitle: string;
  nextSongTitle?: string;
}): void {
  const songTitle = params.songTitle.trim();
  if (!songTitle) return;

  const items = StorageService.getCurriculumItems();
  if (items.length === 0) return;

  const progressList = StorageService.getCurriculumProgress(params.studentId);
  const findItem = (title: string) =>
    items.find((it) => it.title.trim().toLowerCase() === title.trim().toLowerCase());

  const today = todayIsoLocal();
  const currentItem = findItem(songTitle);
  if (currentItem) {
    const existing = progressList.find((p) => p.curriculumItemId === currentItem.id);
    if (existing?.status !== 'completed') {
      StorageService.saveCurriculumProgress({
        ...(existing ? { id: existing.id } : {}),
        studentId: params.studentId,
        curriculumItemId: currentItem.id,
        status: 'completed',
        completedAt: today,
        notes: existing?.notes,
      });
    }
  }

  const nextTitle = params.nextSongTitle?.trim();
  if (!nextTitle) return;

  const nextItem = findItem(nextTitle);
  if (!nextItem) return;

  const existingNext = StorageService.getCurriculumProgress(params.studentId).find(
    (p) => p.curriculumItemId === nextItem.id
  );
  if (existingNext?.status === 'completed') return;
  if (existingNext?.status === 'in_progress') return;

  StorageService.saveCurriculumProgress({
    ...(existingNext ? { id: existingNext.id } : {}),
    studentId: params.studentId,
    curriculumItemId: nextItem.id,
    status: 'in_progress',
    notes: existingNext?.notes,
  });
}
