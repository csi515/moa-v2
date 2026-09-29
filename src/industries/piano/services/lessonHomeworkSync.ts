import { StorageService } from '@/services/storage';
import type { AssignmentItem, WeeklyAssignment } from '@/types/education';
import { planLessonHomeworkSync } from './lessonHomeworkPlan';

export { planLessonHomeworkSync, modelSerializedHomeworkSync } from './lessonHomeworkPlan';

/**
 * 레슨 숙제를 이번 주 주간 과제에 반영합니다.
 * 저장 직전 최신 목록을 다시 읽어 다른 강사 항목을 덮지 않는다.
 * 신규 assignment는 id를 먼저 정해 한 번만 저장한다.
 */
export function syncLessonHomeworkToWeeklyAssignment(params: {
  studentId: string;
  songTitle: string;
  homework: string;
  staffId?: string | null;
}): void {
  const homework = params.homework.trim();
  if (!homework) return;

  const weekStart = StorageService.getCurrentWeekStart();
  const latest = StorageService.getWeeklyAssignments(params.studentId).find(
    (a) => a.weekStart === weekStart
  );
  const plan = planLessonHomeworkSync({
    latestItems: latest?.items || [],
    songTitle: params.songTitle,
    homework,
  });
  if (plan.action === 'noop') return;

  const assignmentId = latest?.id || crypto.randomUUID();
  persistWeeklyAssignment({
    assignmentId,
    existing: latest,
    studentId: params.studentId,
    staffId: params.staffId,
    weekStart,
    items: plan.items,
  });
}

function persistWeeklyAssignment(params: {
  assignmentId: string;
  existing?: WeeklyAssignment;
  studentId: string;
  staffId?: string | null;
  weekStart: string;
  items: AssignmentItem[];
}): void {
  StorageService.saveWeeklyAssignment({
    id: params.assignmentId,
    studentId: params.studentId,
    staffId: params.staffId || params.existing?.staffId,
    weekStart: params.weekStart,
    title: params.existing?.title || `${params.weekStart} 주간 과제`,
    status: 'assigned',
    publishedAt: params.existing?.publishedAt || new Date().toISOString(),
    items: params.items.map((it) => ({ ...it, assignmentId: params.assignmentId })),
  });
}
