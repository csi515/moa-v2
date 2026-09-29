import type {
  AppNotification,
  ClassItem,
  Consultation,
} from '../../../types';
import { readLocal, writeLocal } from '../localStorageEngine';
import { STORAGE_KEYS } from '../storageKeys';
import {
  classToServiceRow,
  consultationToRow,
  notificationToRow,
  bookingToScheduleRow,
  serviceOfferingToRow,
} from './entityMappers';
import type { Booking, ServiceOffering, SessionPass } from '../../../core/types/schedule';
import { sessionToCoreRow } from './attendanceEntityMappers';
import type { AttendanceSession } from '../../../core/attendance/types';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import { requireCacheList, runRowUpserts } from './persistHelpers';
import type { CoreClient } from './corePersistSyncTable';
import { syncTable } from './corePersistSyncTable';
import { sessionPassToRow } from './sessionPassMappers';
import { pendingDeleteIds } from '../pendingMutations';

export async function persistServices(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  mode: 'piano' | 'pilates',
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  if (mode === 'piano') {
    const classes = requireCacheList<ClassItem>(cache, STORAGE_KEYS.CLASSES, 'services');
    if (!classes) return false;

    const ok = await syncTable(
      client,
      'services',
      orgId,
      classes.map((c) => c.id),
      async () => {
        let upsertOk = true;
        for (const cls of classes) {
          if (isAborted()) return false;
          const row = classToServiceRow(cls, orgId);
          const { error } = await client.from('services').upsert(row);
          if (error) {
            upsertOk = false;
            console.error('Failed to upsert service:', error);
          }

          if (cls.teacherId) {
            const { error: staffError } = await client.from('service_staff').upsert({
              service_id: cls.id,
              staff_id: cls.teacherId,
            });
            if (staffError) {
              upsertOk = false;
              console.error('Failed to upsert service_staff:', staffError);
            }
          }
        }
        return upsertOk;
      },
      { cachePresent: true, context: 'services(classes)', isAborted }
    );
    if (isAborted()) return false;
    writeLocal(STORAGE_KEYS.CLASSES, classes);
    return ok;
  }

  const offerings = requireCacheList<ServiceOffering>(
    cache,
    STORAGE_KEYS.SERVICE_OFFERINGS,
    'services'
  );
  if (!offerings) return false;

  const ok = await syncTable(
    client,
    'services',
    orgId,
    offerings.map((o) => o.id),
    () =>
      runRowUpserts(
        offerings,
        isAborted,
        (offering) => client.from('services').upsert(serviceOfferingToRow(offering, orgId)),
        (error) => console.error('Failed to upsert service offering:', error)
      ),
    { cachePresent: true, context: 'services(offerings)', isAborted }
  );
  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.SERVICE_OFFERINGS, offerings);
  return ok;
}

export async function persistSchedules(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const bookings = requireCacheList<Booking>(cache, STORAGE_KEYS.SCHEDULES, 'schedules');
  if (!bookings) return false;

  const bookingRows = bookings.map((b) => bookingToScheduleRow(b, orgId));
  const tombstones = pendingDeleteIds(STORAGE_KEYS.SCHEDULES, orgId);

  // 단일 예약 저장이 stale 목록으로 원격 예약을 diff-delete 하지 않는다.
  // 삭제는 deleteBooking tombstone / 명시적 row delete 만 허용.
  let ok = await runRowUpserts(
    bookingRows,
    isAborted,
    (row) => client.from('schedules').upsert(row),
    (error) => console.error('Failed to upsert schedule:', error)
  );
  if (ok && tombstones.length > 0 && !isAborted()) {
    const { error: deleteError } = await client
      .from('schedules')
      .delete()
      .eq('organization_id', orgId)
      .in('id', tombstones);
    if (deleteError) {
      console.error('Failed to delete scheduled tombstones:', deleteError);
      ok = false;
    }
  }

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.SCHEDULES, bookings);
  writeLocal(
    STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS,
    cache.get(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS) ||
      readLocal(STORAGE_KEYS.PRACTICE_ROOM_BOOKINGS, [])
  );
  return ok;
}

export async function persistConsultations(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const consultations = requireCacheList<Consultation>(
    cache,
    STORAGE_KEYS.CONSULTATIONS,
    'consultations'
  );
  if (!consultations) return false;

  const ok = await syncTable(
    client,
    'consultations',
    orgId,
    consultations.map((c) => c.id),
    () =>
      runRowUpserts(
        consultations,
        isAborted,
        (cst) => client.from('consultations').upsert(consultationToRow(cst, orgId)),
        (error) => console.error('Failed to upsert consultation:', error)
      ),
    { cachePresent: true, context: 'consultations', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.CONSULTATIONS, consultations);
  return ok;
}

export async function persistNotifications(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const notifications = requireCacheList<AppNotification>(
    cache,
    STORAGE_KEYS.NOTIFICATIONS,
    'notifications'
  );
  if (!notifications) return false;

  const syncOk = await syncTable(
    client,
    'notifications',
    orgId,
    notifications.map((n) => n.id),
    () =>
      runRowUpserts(
        notifications,
        isAborted,
        (notif) => client.from('notifications').upsert(notificationToRow(notif, orgId)),
        (error) => console.error('Failed to upsert notification:', error)
      ),
    { cachePresent: true, context: 'notifications', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.NOTIFICATIONS, notifications);
  return syncOk;
}

export async function persistAttendanceSessions(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const sessions = requireCacheList<AttendanceSession>(
    cache,
    STORAGE_KEYS.ATTENDANCE_SESSIONS,
    'attendance_sessions'
  );
  if (!sessions) return false;

  const ok = await syncTable(
    client,
    'attendance_sessions',
    orgId,
    sessions.map((s) => s.id),
    () =>
      runRowUpserts(
        sessions,
        isAborted,
        (session) => client.from('attendance_sessions').upsert(sessionToCoreRow(session, orgId)),
        (error) => console.error('Failed to upsert attendance session:', error)
      ),
    { cachePresent: true, context: 'attendance_sessions', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.ATTENDANCE_SESSIONS, sessions);
  return ok;
}

export async function persistSessionPasses(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const passes = requireCacheList<SessionPass>(
    cache,
    STORAGE_KEYS.SESSION_PASSES,
    'session_passes'
  );
  if (!passes) return false;

  const rows = passes.map((p) => sessionPassToRow(p, orgId));

  const ok = await runRowUpserts(
    rows,
    isAborted,
    (row) => client.from('session_passes' as 'schedules').upsert(row as never),
    (error) => console.error('Failed to upsert session_pass:', error)
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.SESSION_PASSES, passes);
  return ok;
}
