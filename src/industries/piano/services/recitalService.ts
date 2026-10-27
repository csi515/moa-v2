import { StorageService } from '@/services/storage';
import { AcademyEvent, EventParticipantSummary, PerformanceVideo } from '@/types';
import { academyEventTypeToVideoType } from '../config/eventLabels';

/**
 * 연주회·콩쿠르 도메인 서비스
 * UI → RecitalService → StorageService 계층 분리
 */
export const RecitalService = {
  getRecitalEvents(): AcademyEvent[] {
    return StorageService.getRecitalEvents();
  },

  getEventById(eventId: string): AcademyEvent | undefined {
    return StorageService.getEvents().find((e) => e.id === eventId);
  },

  saveEvent(event: Omit<AcademyEvent, 'id'> & { id?: string }): AcademyEvent {
    return StorageService.saveEvent(event);
  },

  deleteEvent(eventId: string): boolean {
    return StorageService.deleteEvent(eventId);
  },

  getParticipantSummaries(eventId: string): EventParticipantSummary[] {
    return StorageService.getEventParticipantSummaries(eventId);
  },

  getVideosByEventId(eventId: string): PerformanceVideo[] {
    return StorageService.getPerformanceVideosByEventId(eventId);
  },

  addParticipant(eventId: string, studentId: string): AcademyEvent | null {
    return StorageService.addEventParticipant(eventId, studentId);
  },

  removeParticipant(eventId: string, studentId: string): AcademyEvent | null {
    return StorageService.removeEventParticipant(eventId, studentId);
  },

  eventTypeToVideoType: academyEventTypeToVideoType,

  getActiveStudents() {
    return StorageService.getStudents().filter((s) => s.status === 'active');
  },
};
