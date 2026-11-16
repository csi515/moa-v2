import type { DayOfWeek } from '@/core/staff/workWindow';

export interface ClassItem {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  capacity: number;
  level?: string;
  targetLevel?: string;
  fee?: number;
  textbook?: string;
  room: string;
  memo?: string;
  color?: string;
}
