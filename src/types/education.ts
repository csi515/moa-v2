/** 학부모 포털 + 피아노 교육 품질 타입 */

export type CurriculumProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CurriculumLevel {
  id: string;
  name: string;
  sortOrder: number;
  description?: string;
}

export interface CurriculumItem {
  id: string;
  levelId: string;
  songId?: string;
  title: string;
  sortOrder: number;
  required: boolean;
}

export interface StudentCurriculumProgress {
  id: string;
  studentId: string;
  curriculumItemId: string;
  status: CurriculumProgressStatus;
  completedAt?: string;
  notes?: string;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'reviewed';

export interface AssignmentItem {
  id: string;
  assignmentId: string;
  songTitle: string;
  targetMinutes?: number;
  instructions: string;
  sortOrder: number;
  parentConfirmed: boolean;
  parentConfirmedAt?: string;
  completed: boolean;
  completedAt?: string;
}

export interface WeeklyAssignment {
  id: string;
  studentId: string;
  staffId?: string;
  weekStart: string;
  title?: string;
  status: AssignmentStatus;
  teacherNotes?: string;
  parentNotes?: string;
  dueDate?: string;
  publishedAt?: string;
  items: AssignmentItem[];
}

export type AchievementType =
  | 'exam'
  | 'competition'
  | 'certificate'
  | 'grade'
  | 'recital'
  | 'other';

export interface Achievement {
  id: string;
  studentId: string;
  type: AchievementType;
  title: string;
  eventDate?: string;
  result?: string;
  levelLabel?: string;
  songTitle?: string;
  certificateUrl?: string;
  staffId?: string;
  memo?: string;
}

export type LearningReportStatus = 'draft' | 'published' | 'archived';

export interface LearningReport {
  id: string;
  studentId: string;
  staffId?: string;
  yearMonth: string;
  status: LearningReportStatus;
  summary?: string;
  strengths?: string;
  improvements?: string;
  goalsNextMonth?: string;
  attendanceRate?: number;
  practiceMinutes?: number;
  lessonsCount?: number;
  songsCompleted?: number;
  publishedAt?: string;
}

export type ParentPortalTab =
  | 'home'
  | 'attendance'
  | 'tuition'
  | 'assignments'
  | 'progress'
  | 'stamps'
  | 'reports'
  | 'events'
  | 'notices'
  | 'journals'
  | 'medications'
  | 'incidents'
  | 'pickups'
  | 'schedule'
  | 'bookings'
  | 'shuttle'
  | 'more';

export type AcademyEventType = 'concert' | 'competition' | 'special_lesson' | 'tuning' | 'vacation' | 'other';
export type PerformanceVideoEventType = 'recital' | 'competition' | 'lesson' | 'practice' | 'other';

export const ACADEMY_EVENT_TYPE_LABEL: Record<AcademyEventType, string> = {
  concert: '연주회',
  competition: '콩쿠르',
  special_lesson: '특강',
  tuning: '조율',
  vacation: '방학',
  other: '기타',
};

export const PERFORMANCE_VIDEO_TYPE_LABEL: Record<PerformanceVideoEventType, string> = {
  recital: '연주회',
  competition: '콩쿠르',
  lesson: '수업',
  practice: '연습',
  other: '기타',
};

/** 캘린더 이벤트 타입 → 연주 영상 분류 매핑 */
export function academyEventTypeToVideoType(
  type: AcademyEventType
): PerformanceVideoEventType {
  if (type === 'concert') return 'recital';
  if (type === 'competition') return 'competition';
  return 'other';
}

