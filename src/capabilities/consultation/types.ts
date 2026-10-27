export type ConsultationType = 'parent' | 'student' | 'career' | 'learning' | 'other';

export interface Consultation {
  id: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  date: string;
  type: ConsultationType;
  content: string;
  result: string;
  followUp?: string;
  nextDate?: string;
  counselorId: string;
  counselorName: string;
  createdAt?: string;
}
