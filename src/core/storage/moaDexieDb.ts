/**
 * Moa-v2 공통 오프라인 스토리지 (Dexie.js 기반 IndexedDB)
 * 
 * 카운터 출결, POS 간이 영수증, 비동기 아웃박스 등
 * 네트워크 순단 시에도 로컬에 즉시 적재하고 복구 시 FIFO 동기화하는 중앙 오프라인 DB.
 */

import Dexie, { type EntityTable } from 'dexie';

export interface OfflineAttendanceEntity {
  id: string;
  organizationId: string;
  customerId: string;
  pin?: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'makeup';
  metadata?: Record<string, unknown>;
  retryCount: number;
  queuedAt: number;
}

export interface OfflinePosSaleEntity {
  id: string;
  organizationId: string;
  payload: Record<string, unknown>;
  queuedAt: number;
}

export interface OfflineOutboxEntity {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  queuedAt: number;
}

export class MoaDexieDatabase extends Dexie {
  attendance_queue!: EntityTable<OfflineAttendanceEntity, 'id'>;
  pos_sale_queue!: EntityTable<OfflinePosSaleEntity, 'id'>;
  outbox_queue!: EntityTable<OfflineOutboxEntity, 'id'>;

  constructor() {
    super('moa_offline_db');
    this.version(1).stores({
      attendance_queue: 'id, organizationId, customerId, queuedAt',
      pos_sale_queue: 'id, organizationId, queuedAt',
      outbox_queue: 'id, eventType, queuedAt',
    });
  }
}

let dbInstance: MoaDexieDatabase | null = null;

export function getMoaDexieDb(): MoaDexieDatabase | null {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return null;
  }
  if (!dbInstance) {
    dbInstance = new MoaDexieDatabase();
  }
  return dbInstance;
}
