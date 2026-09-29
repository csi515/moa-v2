import type {
  AcademyEvent,
  EventParticipantSummary,
  PerformanceVideo,
  Song,
  Student,
} from '../../types';
import { academyEventTypeToVideoType } from '../../industries/piano/config/eventLabels';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem, type StorageApi } from './helpers';

/** 공연·이벤트·곡·영상 CRUD */
export function createEventsStorage(api: StorageApi) {
  return {
    getSongs(): Song[] {
      return getItem<Song[]>(STORAGE_KEYS.SONGS, []);
    },

    saveSong(song: Omit<Song, 'id'> & { id?: string }): Song {
      const list = this.getSongs();
      let saved: Song;

      if (song.id) {
        const idx = list.findIndex((entry) => entry.id === song.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...song, id: song.id };
          list[idx] = saved;
        } else {
          saved = { ...song, id: song.id };
          list.push(saved);
        }
      } else {
        saved = { ...song, id: generateEntityId('song') };
        list.push(saved);
      }

      setItem(STORAGE_KEYS.SONGS, list);
      return saved;
    },

    deleteSong(id: string): boolean {
      const list = this.getSongs();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.SONGS, list);
      return true;
    },

    getEvents(): AcademyEvent[] {
      return getItem<AcademyEvent[]>(STORAGE_KEYS.EVENTS, []);
    },

    saveEvent(event: Omit<AcademyEvent, 'id'> & { id?: string }): AcademyEvent {
      const list = this.getEvents();
      let saved: AcademyEvent;

      if (event.id) {
        const idx = list.findIndex((entry) => entry.id === event.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...event, id: event.id };
          list[idx] = saved;
        } else {
          saved = { ...event, id: event.id };
          list.unshift(saved);
        }
      } else {
        saved = { ...event, id: generateEntityId('ev') };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.EVENTS, list);
      return saved;
    },

    deleteEvent(id: string): boolean {
      const list = this.getEvents();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.EVENTS, list);
      return true;
    },

    getRecitalEvents(): AcademyEvent[] {
      return this.getEvents()
        .filter((event) => event.type === 'concert' || event.type === 'competition')
        .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    },

    eventTypeToVideoType(type: AcademyEvent['type']): PerformanceVideo['eventType'] {
      return academyEventTypeToVideoType(type);
    },

    getPerformanceVideosByEventId(eventId: string): PerformanceVideo[] {
      return this.getPerformanceVideos().filter((video) => video.eventId === eventId);
    },

    getEventParticipantSummaries(eventId: string): EventParticipantSummary[] {
      const event = this.getEvents().find((entry) => entry.id === eventId);
      if (!event) return [];

      const students = (api.getStudents as () => Student[])();
      const videos = this.getPerformanceVideosByEventId(eventId);

      return (event.participantIds || []).map((studentId) => {
        const student = students.find((entry) => entry.id === studentId);
        const video = videos.find((entry) => entry.studentId === studentId);
        return {
          studentId,
          studentName: student?.name || '알 수 없음',
          parentPhone: student?.parentPhone || '',
          level: student?.level,
          hasVideo: Boolean(video),
          videoId: video?.id,
          videoTitle: video?.title,
        };
      });
    },

    setEventParticipants(eventId: string, participantIds: string[]): AcademyEvent | null {
      const event = this.getEvents().find((entry) => entry.id === eventId);
      if (!event) return null;
      return this.saveEvent({ ...event, participantIds });
    },

    addEventParticipant(eventId: string, studentId: string): AcademyEvent | null {
      const event = this.getEvents().find((entry) => entry.id === eventId);
      if (!event) return null;
      const ids = event.participantIds || [];
      if (ids.includes(studentId)) return event;
      return this.saveEvent({ ...event, participantIds: [...ids, studentId] });
    },

    removeEventParticipant(eventId: string, studentId: string): AcademyEvent | null {
      const event = this.getEvents().find((entry) => entry.id === eventId);
      if (!event) return null;
      const ids = (event.participantIds || []).filter((id) => id !== studentId);
      return this.saveEvent({ ...event, participantIds: ids });
    },

    getPerformanceVideos(): PerformanceVideo[] {
      return getItem<PerformanceVideo[]>(STORAGE_KEYS.PERFORMANCE_VIDEOS, []);
    },

    getPerformanceVideosByStudentId(studentId: string): PerformanceVideo[] {
      return this.getPerformanceVideos().filter((video) => video.studentId === studentId);
    },

    savePerformanceVideo(
      video: Omit<PerformanceVideo, 'id'> & { id?: string }
    ): PerformanceVideo {
      const list = this.getPerformanceVideos();
      let saved: PerformanceVideo;

      if (video.id) {
        const idx = list.findIndex((entry) => entry.id === video.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...video, id: video.id };
          list[idx] = saved;
        } else {
          saved = { ...video, id: video.id };
          list.unshift(saved);
        }
      } else {
        saved = { ...video, id: generateEntityId('pv') };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.PERFORMANCE_VIDEOS, list);
      return saved;
    },

    deletePerformanceVideo(id: string): boolean {
      const list = this.getPerformanceVideos();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.PERFORMANCE_VIDEOS, list);
      return true;
    },
  };
}
