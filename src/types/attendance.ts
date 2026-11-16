export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'make_up';

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: AttendanceStatus;
  absentReason?: string;
  makeUpRequired?: boolean;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  memo?: string;
  createdBy: string;
  createdAt?: string;
  sessionPassId?: string;
}

export type MakeupStatus = 'pending' | 'scheduled' | 'completed';

export interface MakeupItem {
  id?: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentPhone?: string;
  classId: string;
  className: string;
  originalDate: string;
  absentReason?: string;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  status: MakeupStatus;
  memo?: string;
}

export interface MakeupScheduleInput {
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  teacherId?: string;
  teacherName?: string;
}
