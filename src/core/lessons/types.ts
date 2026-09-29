export interface PracticeRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  minutes: number;
  songTitle: string;
  textbook?: string;
  page?: string;
  homework?: string;
  teacherEvaluation?: string;
  difficultyPart?: string;
  nextAssignment?: string;
  source?: 'staff' | 'parent';
  staffReviewed?: boolean;
  staffReviewedAt?: string;
  staffReviewNote?: string;
  createdAt?: string;
}

export interface LessonRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  classId?: string;
  className?: string;
  songTitle: string;
  progress: string;
  lessonContent: string;
  strengths?: string;
  weaknesses?: string;
  homework?: string;
  nextPlan?: string;
  teacherNotes?: string;
  memo?: string;
  teacherId: string;
  teacherName: string;
  createdAt?: string;
}

export type PerformanceVideoType = 'recital' | 'competition' | 'lesson' | 'practice' | 'other';

export interface PerformanceVideo {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  youtubeUrl: string;
  recordedDate?: string;
  eventType: PerformanceVideoType;
  songTitle?: string;
  memo?: string;
  eventId?: string;
  eventTitle?: string;
  createdAt?: string;
}

export interface Song {
  id: string;
  title: string;
  composer: string;
  difficulty: '초급' | '중급' | '고급' | '최고급';
  genre: '클래식' | '재즈/뉴에이지' | 'OST/가요' | '동요/소곡' | '입시곡';
  relatedTextbook?: string;
  memo?: string;
  publisher?: string;
  level?: string;
  resourceType?: 'textbook' | 'repertoire' | 'competition' | 'theory';
  description?: string;
  difficultyStars?: number;
}
