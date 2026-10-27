import { StorageService } from '@/services/storage';
import { careStorage } from './careStorage';
import type { Student } from '@/types';

export interface TodayCareClose {
  today: string;
  missingJournals: Student[];
  pendingMedications: { id: string; studentName: string; medicineName: string }[];
  mealSampleMissing: boolean;
  awaitingPickup: Student[];
}

export function getCheckedInStudentIds(today: string): Set<string> {
  return new Set(
    StorageService.getAttendanceSessions()
      .filter((session) => session.sessionDate === today && session.checkInAt)
      .map((session) => session.customerId)
  );
}

/** 오늘 등원한 원아 기준 알림장·투약·보존식·하원 */
export function buildTodayCareClose(students: Student[], today: string): TodayCareClose {
  const checkedInIds = getCheckedInStudentIds(today);
  const checkedIn = students.filter((student) => checkedInIds.has(student.id));
  const written = new Set(
    careStorage.getCareJournals()
      .filter((journal) => journal.journalDate === today)
      .map((journal) => journal.studentId)
  );
  const pickedUp = new Set(
    careStorage.getCarePickupLogs()
      .filter((log) => log.pickupDate === today)
      .map((log) => log.studentId)
  );
  const mealSampleMissing = !careStorage.getMealSampleLogs().some((log) =>
    log.storedAt.slice(0, 10) === today
  );

  return {
    today,
    missingJournals: checkedIn.filter((student) => !written.has(student.id)),
    pendingMedications: careStorage.getMedicationRequests()
      .filter((item) => item.requestDate === today && item.status === 'requested')
      .map((item) => ({
        id: item.id,
        studentName: item.studentName,
        medicineName: item.medicineName,
      })),
    mealSampleMissing,
    awaitingPickup: checkedIn.filter((student) => !pickedUp.has(student.id)),
  };
}
