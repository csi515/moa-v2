import { parentStorage } from '@/capabilities/parent/infrastructure/parentStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import type { AcademyEvent, EventParticipantSummary } from '@/core/events';
import type { PerformanceVideo } from '@/core/lessons/types';
import { academyEventTypeToVideoType } from '../config/eventLabels';

/**
 * 연주회·콩쿠르 도메인 서비스
 * UI → RecitalService → domain facade 계층 분리
 */
export const RecitalService = {
  getRecitalEvents(): AcademyEvent[] {
    return parentStorage.getRecitalEvents();
  },

  getEventById(eventId: string): AcademyEvent | undefined {
    return parentStorage.getEvents().find((e) => e.id === eventId);
  },

  saveEvent(event: Omit<AcademyEvent, 'id'> & { id?: string }): AcademyEvent {
    return parentStorage.saveEvent(event);
  },

  deleteEvent(eventId: string): boolean {
    return parentStorage.deleteEvent(eventId);
  },

  getParticipantSummaries(eventId: string): EventParticipantSummary[] {
    return parentStorage.getEventParticipantSummaries(eventId);
  },

  getVideosByEventId(eventId: string): PerformanceVideo[] {
    return parentStorage.getPerformanceVideosByEventId(eventId);
  },

  addParticipant(eventId: string, studentId: string): AcademyEvent | null {
    return parentStorage.addEventParticipant(eventId, studentId);
  },

  removeParticipant(eventId: string, studentId: string): AcademyEvent | null {
    return parentStorage.removeEventParticipant(eventId, studentId);
  },

  eventTypeToVideoType: academyEventTypeToVideoType,

  getActiveStudents() {
    return rosterStorage.getStudents().filter((s) => s.status === 'active');
  },
};
