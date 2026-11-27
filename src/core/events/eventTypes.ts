/** 사업장 캘린더 행사 공개 범위 */
export type EventVisibility = 'private' | 'public';

/** 사업장 캘린더 행사. type 값 집합은 Industry 화면이 해석한다. */

export type AcademyEventType =
  | 'concert'
  | 'competition'
  | 'special_lesson'
  | 'tuning'
  | 'vacation'
  | 'personal'
  | 'event'
  | 'maintenance'
  | 'other';

export type WorkplaceEventType = AcademyEventType;

export interface AcademyEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  type: AcademyEventType;
  description?: string;
  color?: string;
  participantIds?: string[];
  participationFee?: number;
  ownerUserId?: string | null;
  visibility?: EventVisibility;
}

export interface EventParticipantSummary {
  studentId: string;
  studentName: string;
  parentPhone: string;
  level?: string;
  hasVideo: boolean;
  videoId?: string;
  videoTitle?: string;
}
