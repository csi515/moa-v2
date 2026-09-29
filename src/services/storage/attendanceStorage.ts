import type { AttendanceRecord, MakeupItem, MakeupScheduleInput, Student } from '../../types';
import { getStorageAdapter, STORAGE_KEYS } from '../adapters';
import { generateEntityId, getItem, setItem, type StorageApi } from './helpers';
import type { AttendanceSession, CheckInMethod, PinCheckResult } from '../../core/attendance/types';
import { isAttendanceModuleEnabled } from '../../core/attendance/features';
import { DAY_ATTENDANCE_CLASS_ID } from '../../core/attendance/dayAttendance';
import {
  assignCustomerPin,
  generateUniquePin,
  toggleCheckInByPinLocal,
} from '../../core/attendance/services/attendanceService';
import { getIndustryType } from '../adapters/storageContext';
import { dispatchAppPush } from '@/core/push';

/** 출결·PIN·보강 도메인 */
export function createAttendanceStorage(api: StorageApi) {
  return {
    getAttendance(): AttendanceRecord[] {
      return getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    },

    saveAttendanceRecord(
      record: Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string }
    ): AttendanceRecord {
      const list = (api.getAttendance as () => AttendanceRecord[])();
      const now = new Date().toISOString();
      let saved: AttendanceRecord;

      const existingIdx = record.id
        ? list.findIndex((r) => r.id === record.id)
        : list.findIndex(
            (r) =>
              r.date === record.date &&
              r.studentId === record.studentId &&
              r.classId === record.classId
          );

      if (existingIdx >= 0) {
        saved = { ...list[existingIdx], ...record, id: list[existingIdx].id };
        if (saved.status === 'absent') {
          saved.makeUpRequired = true;
        }
        list[existingIdx] = saved;
      } else {
        saved = {
          ...record,
          id: generateEntityId('att'),
          createdAt: now,
        };
        if (record.status === 'absent') {
          saved.makeUpRequired = true;
        }
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.ATTENDANCE, list);
      return saved;
    },

    batchSaveAttendance(
      records: (Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string })[]
    ): void {
      const list = (api.getAttendance as () => AttendanceRecord[])();
      const now = new Date().toISOString();

      records.forEach((record) => {
        const idx = record.id
          ? list.findIndex((r) => r.id === record.id)
          : list.findIndex(
              (r) =>
                r.date === record.date &&
                r.studentId === record.studentId &&
                r.classId === record.classId
            );

        if (idx >= 0) {
          list[idx] = { ...list[idx], ...record, id: list[idx].id };
        } else {
          list.unshift({
            ...record,
            id: generateEntityId('att'),
            createdAt: now,
          });
        }
      });

      setItem(STORAGE_KEYS.ATTENDANCE, list);
    },

    deleteAttendance(id: string): boolean {
      const list = (api.getAttendance as () => AttendanceRecord[])();
      const filtered = list.filter((r) => r.id !== id);
      if (filtered.length !== list.length) {
        setItem(STORAGE_KEYS.ATTENDANCE, filtered);
        return true;
      }
      return false;
    },

    getAttendanceSessions(): AttendanceSession[] {
      return getItem<AttendanceSession[]>(STORAGE_KEYS.ATTENDANCE_SESSIONS, []);
    },

    saveAttendanceSessions(sessions: AttendanceSession[]): void {
      setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, sessions);
    },

    saveAttendanceSession(session: AttendanceSession): AttendanceSession {
      const list = (api.getAttendanceSessions as () => AttendanceSession[])();
      const idx = list.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        list[idx] = session;
      } else {
        list.unshift(session);
      }
      setItem(STORAGE_KEYS.ATTENDANCE_SESSIONS, list);
      return session;
    },

    getCustomerPins(): { customerId: string; pinHash: string }[] {
      return getItem(STORAGE_KEYS.CUSTOMER_PINS, []);
    },

    hasCustomerPin(customerId: string): boolean {
      return (api.getCustomerPins as () => { customerId: string; pinHash: string }[])().some(
        (p) => p.customerId === customerId
      );
    },

    setCustomerPinHash(customerId: string, pinHash: string): void {
      const list = (api.getCustomerPins as () => { customerId: string; pinHash: string }[])().filter(
        (p) => p.customerId !== customerId
      );
      list.push({ customerId, pinHash });
      setItem(STORAGE_KEYS.CUSTOMER_PINS, list);

      const students = (api.getStudents as () => Student[])();
      const idx = students.findIndex((s) => s.id === customerId);
      if (idx >= 0) {
        students[idx] = { ...students[idx], checkInPinSet: true };
        setItem(STORAGE_KEYS.STUDENTS, students);
      }
    },

    clearCustomerPin(customerId: string): void {
      const list = (api.getCustomerPins as () => { customerId: string; pinHash: string }[])().filter(
        (p) => p.customerId !== customerId
      );
      setItem(STORAGE_KEYS.CUSTOMER_PINS, list);

      const students = (api.getStudents as () => Student[])();
      const idx = students.findIndex((s) => s.id === customerId);
      if (idx >= 0) {
        students[idx] = { ...students[idx], checkInPinSet: false };
        setItem(STORAGE_KEYS.STUDENTS, students);
      }
    },

    async setCustomerPin(
      customerId: string,
      pin: string,
      organizationId: string
    ): Promise<{ ok: true } | { ok: false; error: 'invalid_pin_format' | 'pin_already_used' }> {
      const result = await assignCustomerPin({
        organizationId,
        customerId,
        pin,
        pinRecords: (api.getCustomerPins as () => { customerId: string; pinHash: string }[])(),
      });
      if (!result.ok) return result;
      (api.setCustomerPinHash as (id: string, hash: string) => void)(customerId, result.pinHash);
      return { ok: true };
    },

    async generateCustomerPin(
      customerId: string,
      organizationId: string
    ): Promise<{ pin: string }> {
      const { pin, pinHash } = await generateUniquePin({
        organizationId,
        customerId,
        pinRecords: (api.getCustomerPins as () => { customerId: string; pinHash: string }[])(),
      });
      (api.setCustomerPinHash as (id: string, hash: string) => void)(customerId, pinHash);
      return { pin };
    },

    async toggleCheckInByPin(
      pin: string,
      method: CheckInMethod,
      organizationId: string
    ): Promise<PinCheckResult> {
      const settings = (api.getSettings as () => import('../../types').AcademySettings)();
      const industry = getIndustryType() || 'piano';
      const moduleEnabled = isAttendanceModuleEnabled(settings, industry);

      const { result, sessions } = await toggleCheckInByPinLocal({
        organizationId,
        pin,
        method,
        pinRecords: (api.getCustomerPins as () => { customerId: string; pinHash: string }[])(),
        sessions: (api.getAttendanceSessions as () => AttendanceSession[])(),
        students: (api.getStudents as () => Student[])(),
        moduleEnabled,
      });

      if (result.success) {
        (api.saveAttendanceSessions as (s: AttendanceSession[]) => void)(sessions);
        try {
          const adapter = getStorageAdapter();
          if (adapter.flushPersist) {
            await adapter.flushPersist([STORAGE_KEYS.ATTENDANCE_SESSIONS]);
          }
        } catch {
          /* 원격 반영 실패는 출석 성공을 뒤집지 않는다. outbox가 재시도한다. */
        }
        void dispatchAppPush({
          organizationId,
          studentId: result.customerId,
          title: `${result.customerName} 출석 완료`,
          body: `${result.customerName} 학생 출석이 완료되었습니다.`,
          portalTab: 'attendance',
          type: 'attendance',
        });
      }

      return result;
    },

    getMakeupItems(): MakeupItem[] {
      const students = (api.getStudents as () => Student[])();
      const studentMap = new Map(students.map((s) => [s.id, s]));
      const statusRank: Record<MakeupItem['status'], number> = {
        completed: 2,
        scheduled: 1,
        pending: 0,
      };

      const mapped = (api.getAttendance as () => AttendanceRecord[])()
        .filter((r) => r.status === 'absent' || r.status === 'make_up')
        .map((r) => {
          const st = studentMap.get(r.studentId);
          let status: MakeupItem['status'] = 'pending';
          if (r.status === 'make_up') {
            status = 'completed';
          } else if (r.makeUpDate) {
            status = 'scheduled';
          }

          return {
            attendanceId: r.id,
            studentId: r.studentId,
            studentName: r.studentName,
            parentPhone: st?.parentPhone || '',
            classId: r.classId,
            className: r.className,
            originalDate: r.date,
            absentReason: r.absentReason,
            makeUpDate: r.makeUpDate,
            makeUpStartTime: r.makeUpStartTime,
            makeUpEndTime: r.makeUpEndTime,
            makeUpRoom: r.makeUpRoom,
            makeUpTeacherId: r.makeUpTeacherId,
            makeUpTeacherName: r.makeUpTeacherName,
            status,
            memo: r.memo,
          } satisfies MakeupItem;
        });

      // 등원(c-default) + 레슨 이중 absent면 학생·원결석일 기준 1장만
      const byKey = new Map<string, MakeupItem>();
      for (const item of mapped) {
        const key = `${item.studentId}|${item.originalDate}`;
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, item);
          continue;
        }
        if (statusRank[item.status] !== statusRank[existing.status]) {
          byKey.set(
            key,
            statusRank[item.status] > statusRank[existing.status] ? item : existing
          );
          continue;
        }
        const preferItem =
          item.classId !== DAY_ATTENDANCE_CLASS_ID &&
          existing.classId === DAY_ATTENDANCE_CLASS_ID;
        byKey.set(key, preferItem ? item : existing);
      }

      return Array.from(byKey.values()).sort((a, b) => {
        if (statusRank[a.status] !== statusRank[b.status]) {
          return statusRank[a.status] - statusRank[b.status];
        }
        return b.originalDate.localeCompare(a.originalDate);
      });
    },

    scheduleMakeup(
      attendanceId: string,
      makeup: string | MakeupScheduleInput
    ): AttendanceRecord | null {
      const list = (api.getAttendance as () => AttendanceRecord[])();
      const idx = list.findIndex((r) => r.id === attendanceId);
      if (idx === -1) return null;

      const input: MakeupScheduleInput =
        typeof makeup === 'string' ? { date: makeup } : makeup;

      const updated: AttendanceRecord = {
        ...list[idx],
        makeUpDate: input.date,
        makeUpRequired: true,
        makeUpStartTime: input.startTime || undefined,
        makeUpEndTime: input.endTime || undefined,
        makeUpRoom: input.room || undefined,
        makeUpTeacherId: input.teacherId || undefined,
        makeUpTeacherName: input.teacherName || undefined,
      };
      list[idx] = updated;
      setItem(STORAGE_KEYS.ATTENDANCE, list);
      return updated;
    },

    completeMakeup(attendanceId: string, memo?: string): AttendanceRecord | null {
      const list = (api.getAttendance as () => AttendanceRecord[])();
      const idx = list.findIndex((r) => r.id === attendanceId);
      if (idx === -1) return null;
      const updated: AttendanceRecord = {
        ...list[idx],
        status: 'make_up',
        makeUpRequired: false,
        memo: memo || list[idx].memo,
      };
      list[idx] = updated;
      setItem(STORAGE_KEYS.ATTENDANCE, list);
      return updated;
    },
  };
}
