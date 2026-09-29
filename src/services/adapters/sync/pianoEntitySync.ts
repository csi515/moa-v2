import type {
  AcademyEvent,
  AttendanceRecord,
  LessonRecord,
  PerformanceVideo,
  PracticeRecord,
  Song,
  Student,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookSale,
} from '../../../types';
import { getPianoClient } from '../../../lib/supabase/pianoClient';
import { readLocal, writeLocal } from '../localStorageEngine';
import { applyDirtyListMerge } from '../pendingMutations';
import { PIANO_SYNC_KEYS, STORAGE_KEYS, type StorageKey } from '../storageKeys';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import {
  attendanceToPianoRow,
  eventToPianoRow,
  inventoryToPianoRow,
  lessonToPianoRow,
  mergeStudentWithPiano,
  performanceVideoToPianoRow,
  pianoRowToAttendance,
  pianoRowToEvent,
  pianoRowToInventory,
  pianoRowToLesson,
  pianoRowToPayment,
  pianoRowToPerformanceVideo,
  pianoRowToPractice,
  pianoRowToSale,
  pianoRowToSong,
  pianoRowToTextbook,
  practiceToPianoRow,
  songToPianoRow,
  textbookToPianoRow,
} from './pianoEntityMappers';
import { checkHydrateErrors } from './persistHelpers';
import {
  persistPianoCustomers,
  persistPianoTable,
} from './pianoEntityPersist';
import {
  mergeTextbookPaymentsWithLegacy,
  mergeTextbookSalesWithLegacy,
} from '../../../industries/piano/services/textbookSaleLegacy';

/** Piano 모듈 hydrate — Core hydrate 이후 호출 */
export async function hydratePianoEntities(
  organizationId: string,
  cache: SyncCache
): Promise<void> {
  const client = getPianoClient();

  const [
    pianoCustomersResult,
    classMembersResult,
    attendanceResult,
    lessonResult,
    practiceResult,
    textbooksResult,
    salesResult,
    paymentsResult,
    inventoryResult,
    songsResult,
    eventsResult,
    performanceVideosResult,
  ] = await Promise.all([
    client.from('customers').select('*').eq('organization_id', organizationId),
    client.from('class_members').select('*').eq('organization_id', organizationId),
    client.from('attendance').select('*').eq('organization_id', organizationId),
    client.from('lesson_records').select('*').eq('organization_id', organizationId),
    client.from('practice_records').select('*').eq('organization_id', organizationId),
    client.from('textbooks').select('*').eq('organization_id', organizationId),
    client.from('textbook_sales').select('*').eq('organization_id', organizationId),
    client.from('textbook_payments').select('*').eq('organization_id', organizationId),
    client.from('textbook_inventory_transactions').select('*').eq('organization_id', organizationId),
    client.from('songs').select('*').eq('organization_id', organizationId),
    client.from('events').select('*').eq('organization_id', organizationId),
    client.from('performance_videos').select('*').eq('organization_id', organizationId),
  ]);

  checkHydrateErrors(
    {
      pianoCustomers: pianoCustomersResult.error,
      classMembers: classMembersResult.error,
      attendance: attendanceResult.error,
      lessonRecords: lessonResult.error,
      practiceRecords: practiceResult.error,
      textbooks: textbooksResult.error,
      sales: salesResult.error,
      payments: paymentsResult.error,
      inventory: inventoryResult.error,
      songs: songsResult.error,
      events: eventsResult.error,
      performanceVideos: performanceVideosResult.error,
    },
    'piano'
  );

  // Merge piano.customers + class_members into students
  const teachers = cache.get<{ id: string; name: string }[]>(STORAGE_KEYS.TEACHERS) || [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const pianoMap = new Map((pianoCustomersResult.data || []).map((p) => [p.customer_id, p]));

  const classIdsByCustomer = new Map<string, string[]>();
  for (const m of classMembersResult.data || []) {
    const list = classIdsByCustomer.get(m.customer_id) || [];
    list.push(m.service_id);
    classIdsByCustomer.set(m.customer_id, list);
  }

  const baseStudents = cache.get<Student[]>(STORAGE_KEYS.STUDENTS) || [];
  const mergedStudents = baseStudents.map((s) => {
    const pianoRow = pianoMap.get(s.id);
    const classIds = classIdsByCustomer.get(s.id) || s.classIds;
    if (!pianoRow) return { ...s, classIds };
    const teacherName = pianoRow.teacher_id ? teacherMap.get(pianoRow.teacher_id) : s.teacherName;
    return mergeStudentWithPiano(s, pianoRow, classIds, teacherName);
  });

  // 교재 판매/수납: DB direct CRUD가 원본. localStorage는 mirror + legacy local-only 행 병합
  // (자동 업로드·diff-delete 없음). hydrate 직전 cache.clear → org 스코프 local에서 legacy 읽기
  const localSales = readLocal<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
  const localPayments = readLocal<TextbookPayment[]>(STORAGE_KEYS.TEXTBOOK_PAYMENTS, []);
  const dbSales = (salesResult.data || []).map(pianoRowToSale);
  const dbPayments = (paymentsResult.data || []).map(pianoRowToPayment);

  const entities: [StorageKey, unknown][] = [
    [STORAGE_KEYS.STUDENTS, mergedStudents],
    [
      STORAGE_KEYS.ATTENDANCE,
      applyDirtyListMerge(
        STORAGE_KEYS.ATTENDANCE,
        (attendanceResult.data || []).map(pianoRowToAttendance)
      ),
    ],
    [STORAGE_KEYS.LESSON_RECORDS, (lessonResult.data || []).map(pianoRowToLesson)],
    [STORAGE_KEYS.PRACTICE_RECORDS, (practiceResult.data || []).map(pianoRowToPractice)],
    [STORAGE_KEYS.TEXTBOOKS, (textbooksResult.data || []).map(pianoRowToTextbook)],
    [STORAGE_KEYS.TEXTBOOK_SALES, mergeTextbookSalesWithLegacy(dbSales, localSales)],
    [STORAGE_KEYS.TEXTBOOK_PAYMENTS, mergeTextbookPaymentsWithLegacy(dbPayments, localPayments)],
    [
      STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
      (inventoryResult.data || []).map(pianoRowToInventory),
    ],
    [STORAGE_KEYS.SONGS, (songsResult.data || []).map(pianoRowToSong)],
    [STORAGE_KEYS.EVENTS, (eventsResult.data || []).map(pianoRowToEvent)],
    [STORAGE_KEYS.PERFORMANCE_VIDEOS, (performanceVideosResult.data || []).map(pianoRowToPerformanceVideo)],
  ];

  for (const [key, value] of entities) {
    cache.set(key, value);
    writeLocal(key, value);
  }
}

/** Piano 모듈 persist — false면 soft-fail(outbox 유지) */
export async function persistPianoEntity(
  key: StorageKey,
  organizationId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard = () => false
): Promise<boolean> {
  if (!PIANO_SYNC_KEYS.has(key)) return true;
  if (isAborted()) return false;

  switch (key) {
    case STORAGE_KEYS.STUDENTS:
      return persistPianoCustomers(organizationId, cache, isAborted);
    case STORAGE_KEYS.ATTENDANCE:
      return persistPianoTable(
        'attendance',
        organizationId,
        cache,
        STORAGE_KEYS.ATTENDANCE,
        (items) => (items as AttendanceRecord[]).map((r) => attendanceToPianoRow(r, organizationId)),
        isAborted,
        { allowDiffDelete: false }
      );
    case STORAGE_KEYS.LESSON_RECORDS:
      return persistPianoTable(
        'lesson_records',
        organizationId,
        cache,
        STORAGE_KEYS.LESSON_RECORDS,
        (items) => (items as LessonRecord[]).map((r) => lessonToPianoRow(r, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.PRACTICE_RECORDS:
      return persistPianoTable(
        'practice_records',
        organizationId,
        cache,
        STORAGE_KEYS.PRACTICE_RECORDS,
        (items) => (items as PracticeRecord[]).map((r) => practiceToPianoRow(r, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.TEXTBOOKS:
      return persistPianoTable(
        'textbooks',
        organizationId,
        cache,
        STORAGE_KEYS.TEXTBOOKS,
        (items) => (items as Textbook[]).map((t) => textbookToPianoRow(t, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.TEXTBOOK_SALES:
    case STORAGE_KEYS.TEXTBOOK_PAYMENTS:
      // DB 우선 직접 CRUD — debounced persist/diff-delete 비활성
      return true;
    case STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS:
      return persistPianoTable(
        'textbook_inventory_transactions',
        organizationId,
        cache,
        STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
        (items) =>
          (items as TextbookInventoryTransaction[]).map((t) => inventoryToPianoRow(t, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.SONGS:
      return persistPianoTable(
        'songs',
        organizationId,
        cache,
        STORAGE_KEYS.SONGS,
        (items) => (items as Song[]).map((s) => songToPianoRow(s, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.EVENTS:
      return persistPianoTable(
        'events',
        organizationId,
        cache,
        STORAGE_KEYS.EVENTS,
        (items) => (items as AcademyEvent[]).map((e) => eventToPianoRow(e, organizationId)),
        isAborted
      );
    case STORAGE_KEYS.PERFORMANCE_VIDEOS:
      return persistPianoTable(
        'performance_videos',
        organizationId,
        cache,
        STORAGE_KEYS.PERFORMANCE_VIDEOS,
        (items) =>
          (items as PerformanceVideo[]).map((v) => performanceVideoToPianoRow(v, organizationId)),
        isAborted
      );
    default:
      return true;
  }
}
