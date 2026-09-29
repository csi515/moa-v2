import type { Json } from '@/lib/supabase/database.types';
import type {
  Achievement,
  AssignmentItem,
  CurriculumItem,
  CurriculumLevel,
  LearningReport,
  StudentCurriculumProgress,
  WeeklyAssignment,
} from '@/types/education';

type CurriculumLevelRow = {
  id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  description: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type CurriculumItemRow = {
  id: string;
  organization_id: string;
  level_id: string;
  song_id: string | null;
  title: string;
  sort_order: number;
  required: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type CurriculumProgressRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  curriculum_item_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type WeeklyAssignmentRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  staff_id: string | null;
  week_start: string;
  title: string | null;
  status: 'assigned' | 'in_progress' | 'submitted' | 'reviewed';
  teacher_notes: string | null;
  parent_notes: string | null;
  due_date: string | null;
  published_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type AssignmentItemRow = {
  id: string;
  assignment_id: string;
  organization_id: string;
  song_title: string;
  target_minutes: number | null;
  instructions: string;
  sort_order: number;
  parent_confirmed: boolean;
  parent_confirmed_at: string | null;
  completed: boolean;
  completed_at: string | null;
  metadata: Json;
  created_at: string;
};

type AchievementRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  type: Achievement['type'];
  title: string;
  event_date: string | null;
  result: string | null;
  level_label: string | null;
  song_title: string | null;
  certificate_url: string | null;
  staff_id: string | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type LearningReportRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  staff_id: string | null;
  year_month: string;
  status: 'draft' | 'published' | 'archived';
  summary: string | null;
  strengths: string | null;
  improvements: string | null;
  goals_next_month: string | null;
  attendance_rate: number | null;
  practice_minutes: number | null;
  lessons_count: number | null;
  songs_completed: number | null;
  published_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export function rowToCurriculumLevel(row: CurriculumLevelRow): CurriculumLevel {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    description: row.description || undefined,
  };
}

export function curriculumLevelToRow(level: CurriculumLevel, orgId: string) {
  return {
    id: level.id,
    organization_id: orgId,
    name: level.name,
    sort_order: level.sortOrder,
    description: level.description || null,
    metadata: {} as Json,
  };
}

export function rowToCurriculumItem(row: CurriculumItemRow): CurriculumItem {
  return {
    id: row.id,
    levelId: row.level_id,
    songId: row.song_id || undefined,
    title: row.title,
    sortOrder: row.sort_order,
    required: row.required,
  };
}

export function curriculumItemToRow(item: CurriculumItem, orgId: string) {
  return {
    id: item.id,
    organization_id: orgId,
    level_id: item.levelId,
    song_id: item.songId || null,
    title: item.title,
    sort_order: item.sortOrder,
    required: item.required,
    metadata: {} as Json,
  };
}

export function rowToCurriculumProgress(row: CurriculumProgressRow): StudentCurriculumProgress {
  return {
    id: row.id,
    studentId: row.customer_id,
    curriculumItemId: row.curriculum_item_id,
    status: row.status,
    completedAt: row.completed_at || undefined,
    notes: row.notes || undefined,
  };
}

export function curriculumProgressToRow(prog: StudentCurriculumProgress, orgId: string) {
  return {
    id: prog.id,
    organization_id: orgId,
    customer_id: prog.studentId,
    curriculum_item_id: prog.curriculumItemId,
    status: prog.status,
    completed_at: prog.completedAt || null,
    notes: prog.notes || null,
    metadata: {} as Json,
  };
}

export function rowToAssignmentItem(row: AssignmentItemRow): AssignmentItem {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    songTitle: row.song_title,
    targetMinutes: row.target_minutes ?? undefined,
    instructions: row.instructions,
    sortOrder: row.sort_order,
    parentConfirmed: row.parent_confirmed,
    parentConfirmedAt: row.parent_confirmed_at || undefined,
    completed: row.completed,
    completedAt: row.completed_at || undefined,
  };
}

export function assignmentItemToRow(item: AssignmentItem, orgId: string) {
  return {
    id: item.id,
    assignment_id: item.assignmentId,
    organization_id: orgId,
    song_title: item.songTitle,
    target_minutes: item.targetMinutes ?? null,
    instructions: item.instructions,
    sort_order: item.sortOrder,
    parent_confirmed: item.parentConfirmed,
    parent_confirmed_at: item.parentConfirmedAt || null,
    completed: item.completed,
    completed_at: item.completedAt || null,
    metadata: {} as Json,
  };
}

export function rowToWeeklyAssignment(
  row: WeeklyAssignmentRow,
  items: AssignmentItemRow[]
): WeeklyAssignment {
  return {
    id: row.id,
    studentId: row.customer_id,
    staffId: row.staff_id || undefined,
    weekStart: row.week_start,
    title: row.title || undefined,
    status: row.status,
    teacherNotes: row.teacher_notes || undefined,
    parentNotes: row.parent_notes || undefined,
    dueDate: row.due_date || undefined,
    publishedAt: row.published_at || undefined,
    items: items.map(rowToAssignmentItem).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function weeklyAssignmentToRow(assignment: WeeklyAssignment, orgId: string) {
  return {
    id: assignment.id,
    organization_id: orgId,
    customer_id: assignment.studentId,
    staff_id: assignment.staffId || null,
    week_start: assignment.weekStart,
    title: assignment.title || null,
    status: assignment.status,
    teacher_notes: assignment.teacherNotes || null,
    parent_notes: assignment.parentNotes || null,
    due_date: assignment.dueDate || null,
    published_at: assignment.publishedAt || null,
    metadata: {} as Json,
  };
}

export function rowToAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    studentId: row.customer_id,
    type: row.type,
    title: row.title,
    eventDate: row.event_date || undefined,
    result: row.result || undefined,
    levelLabel: row.level_label || undefined,
    songTitle: row.song_title || undefined,
    certificateUrl: row.certificate_url || undefined,
    staffId: row.staff_id || undefined,
    memo: row.memo || undefined,
  };
}

export function achievementToRow(ach: Achievement, orgId: string) {
  return {
    id: ach.id,
    organization_id: orgId,
    customer_id: ach.studentId,
    type: ach.type,
    title: ach.title,
    event_date: ach.eventDate || null,
    result: ach.result || null,
    level_label: ach.levelLabel || null,
    song_title: ach.songTitle || null,
    certificate_url: ach.certificateUrl || null,
    staff_id: ach.staffId || null,
    memo: ach.memo || null,
    metadata: {} as Json,
  };
}

export function rowToLearningReport(row: LearningReportRow): LearningReport {
  return {
    id: row.id,
    studentId: row.customer_id,
    staffId: row.staff_id || undefined,
    yearMonth: row.year_month,
    status: row.status,
    summary: row.summary || undefined,
    strengths: row.strengths || undefined,
    improvements: row.improvements || undefined,
    goalsNextMonth: row.goals_next_month || undefined,
    attendanceRate: row.attendance_rate ?? undefined,
    practiceMinutes: row.practice_minutes ?? undefined,
    lessonsCount: row.lessons_count ?? undefined,
    songsCompleted: row.songs_completed ?? undefined,
    publishedAt: row.published_at || undefined,
  };
}

export function learningReportToRow(report: LearningReport, orgId: string) {
  return {
    id: report.id,
    organization_id: orgId,
    customer_id: report.studentId,
    staff_id: report.staffId || null,
    year_month: report.yearMonth,
    status: report.status,
    summary: report.summary || null,
    strengths: report.strengths || null,
    improvements: report.improvements || null,
    goals_next_month: report.goalsNextMonth || null,
    attendance_rate: report.attendanceRate ?? null,
    practice_minutes: report.practiceMinutes ?? null,
    lessons_count: report.lessonsCount ?? null,
    songs_completed: report.songsCompleted ?? null,
    published_at: report.publishedAt || null,
    metadata: {} as Json,
  };
}
