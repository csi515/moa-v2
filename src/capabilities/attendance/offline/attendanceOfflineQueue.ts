/**
 * Attendance Offline-First Queue & Auto-Sync Coordinator
 * 
 * 카운터 출결 패드 네트워크 순단 대응:
 * 1. Dexie.js 기반 공통 IndexedDB 로컬 큐에 즉시 적재하여 에러 팝업 없이 낙관적 반영
 * 2. navigator.onLine 리스너 및 주기적 타이머 기반 네트워크 복구 시 자동 FIFO 드레인 동기화
 * 3. IndexedDB 미지원 환경(Node 테스트 환경 등) 인메모리 Fallback 보장
 */

import { getMoaDexieDb, type OfflineAttendanceEntity } from '@/core/storage/moaDexieDb';

export type OfflineAttendanceRecord = OfflineAttendanceEntity;

// Node / Non-IndexedDB fallback queue
let memoryQueue: OfflineAttendanceRecord[] = [];

/**
 * 출결 기록을 로컬 큐에 즉시 적재 (낙관적 반영용)
 */
export async function enqueueAttendance(
  item: Omit<OfflineAttendanceRecord, 'id' | 'retryCount' | 'queuedAt'>
): Promise<OfflineAttendanceRecord> {
  const record: OfflineAttendanceRecord = {
    ...item,
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    retryCount: 0,
    queuedAt: Date.now(),
  };

  const db = getMoaDexieDb();
  if (!db) {
    memoryQueue.push(record);
    return record;
  }

  try {
    await db.attendance_queue.put(record);
    return record;
  } catch {
    memoryQueue.push(record);
    return record;
  }
}

/**
 * 대기 중인 모든 오프라인 출결 큐 목록 반환
 */
export async function getPendingAttendanceQueue(): Promise<OfflineAttendanceRecord[]> {
  const db = getMoaDexieDb();
  if (!db) {
    return [...memoryQueue];
  }

  try {
    const list = await db.attendance_queue.toArray();
    return list;
  } catch {
    return [...memoryQueue];
  }
}

/**
 * 성공적으로 동기화된 항목을 큐에서 제거
 */
export async function removeAttendanceFromQueue(id: string): Promise<void> {
  memoryQueue = memoryQueue.filter((item) => item.id !== id);

  const db = getMoaDexieDb();
  if (!db) return;

  try {
    await db.attendance_queue.delete(id);
  } catch {
    // ignore
  }
}

/**
 * 큐의 모든 항목을 서버로 플러시/동기화 (FIFO)
 */
export async function flushAttendanceQueue(
  syncHandler: (record: OfflineAttendanceRecord) => Promise<boolean>
): Promise<{ successCount: number; failureCount: number }> {
  const queue = await getPendingAttendanceQueue();
  let successCount = 0;
  let failureCount = 0;

  // FIFO 처리
  const sorted = [...queue].sort((a, b) => a.queuedAt - b.queuedAt);

  for (const item of sorted) {
    try {
      const success = await syncHandler(item);
      if (success) {
        await removeAttendanceFromQueue(item.id);
        successCount++;
      } else {
        failureCount++;
      }
    } catch {
      failureCount++;
    }
  }

  return { successCount, failureCount };
}

/**
 * 네트워크 온라인 복구 시 자동 동기화 리스너 등록
 */
export function initOfflineAttendanceSync(
  syncHandler: (record: OfflineAttendanceRecord) => Promise<boolean>,
  intervalMs = 30_000
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isSyncing = false;

  const triggerSync = async () => {
    if (isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    isSyncing = true;
    try {
      await flushAttendanceQueue(syncHandler);
    } finally {
      isSyncing = false;
    }
  };

  const handleOnline = () => {
    void triggerSync();
  };

  window.addEventListener('online', handleOnline);
  const intervalId = setInterval(() => {
    void triggerSync();
  }, intervalMs);

  // 초기 로드 시 온라인이면 즉시 큐 점검
  if (navigator.onLine) {
    void triggerSync();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}

/** 테스트용 큐 초기화 */
export function _resetMemoryQueueForTesting(): void {
  memoryQueue = [];
}
