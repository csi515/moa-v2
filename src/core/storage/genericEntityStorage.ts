/**
 * Generic Entity Storage Engine.
 *
 * 18개 Long-tail Capability(recipe_bom, digital_contract, table_order_kds 등)를
 * 업종별 개별 테이블 신설 없이 `core.generic_entity_records` (JSONB) 단일 테이블을 통해
 * 완벽한 멀티테넌트(RLS) 클라우드 DB로 영속화하고,
 * 오프라인/테스트 환경에서는 테넌트 격리 로컬스토리지로 graceful fallback을 제공합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

import { getTenantStorageKey } from '../../shared/utils/tenantStorage';

export interface GenericEntityRecord<T = Record<string, any>> {
  id?: string;
  organizationId: string;
  entityType: string;
  referenceId?: string | null;
  recordKey?: string | null;
  payload: T;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 인메모리 / 로컬 폴백 저장소 키 생성
 */
function getStorageKey(organizationId: string, entityType: string): string {
  return getTenantStorageKey(`moa_generic_${entityType}_${organizationId}`);
}

/**
 * 브라우저 로컬 저장소에서 목록 조회 (폴백용)
 */
function getLocalRecords<T>(organizationId: string, entityType: string): GenericEntityRecord<T>[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const key = getStorageKey(organizationId, entityType);
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 브라우저 로컬 저장소에 목록 저장 (폴백용)
 */
function setLocalRecords<T>(
  organizationId: string,
  entityType: string,
  records: GenericEntityRecord<T>[]
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const key = getStorageKey(organizationId, entityType);
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // 쿼터 초과 등 방어
  }
}

/**
 * 제네릭 엔터티 레코드 단건 저장 (생성 또는 갱신)
 */
export async function saveGenericEntityRecord<T = Record<string, any>>(
  record: GenericEntityRecord<T>,
  supabaseClient?: any
): Promise<GenericEntityRecord<T>> {
  const now = new Date().toISOString();
  const targetId = record.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gen_${Date.now()}`);

  const itemToSave: GenericEntityRecord<T> = {
    ...record,
    id: targetId,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  // 1. Supabase 클라이언트가 전달되었거나 사용 가능하면 DB에 저장
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      const dbPayload = {
        id: itemToSave.id,
        organization_id: itemToSave.organizationId,
        entity_type: itemToSave.entityType,
        reference_id: itemToSave.referenceId || null,
        record_key: itemToSave.recordKey || null,
        payload: itemToSave.payload,
        created_at: itemToSave.createdAt,
        updated_at: itemToSave.updatedAt,
      };

      const { data, error } = await supabaseClient
        .from('generic_entity_records')
        .upsert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          organizationId: data.organization_id,
          entityType: data.entity_type,
          referenceId: data.reference_id,
          recordKey: data.record_key,
          payload: data.payload as T,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // DB 에러 시 로컬 폴백 지속
    }
  }

  // 2. 로컬스토리지 폴백 저장
  const existing = getLocalRecords<T>(record.organizationId, record.entityType);
  const idx = existing.findIndex((r) => r.id === targetId || (record.recordKey && r.recordKey === record.recordKey));

  if (idx >= 0) {
    existing[idx] = itemToSave;
  } else {
    existing.push(itemToSave);
  }

  setLocalRecords(record.organizationId, record.entityType, existing);
  return itemToSave;
}

/**
 * 제네릭 엔터티 레코드 목록 조회
 */
export async function listGenericEntityRecords<T = Record<string, any>>(
  organizationId: string,
  entityType: string,
  options?: {
    recordKey?: string;
    referenceId?: string;
    supabaseClient?: any;
  }
): Promise<GenericEntityRecord<T>[]> {
  // 1. Supabase DB 조회 시도
  if (options?.supabaseClient && typeof options.supabaseClient.from === 'function') {
    try {
      let query = options.supabaseClient
        .from('generic_entity_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('entity_type', entityType);

      if (options.recordKey) {
        query = query.eq('record_key', options.recordKey);
      }
      if (options.referenceId) {
        query = query.eq('reference_id', options.referenceId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          organizationId: d.organization_id,
          entityType: d.entity_type,
          referenceId: d.reference_id,
          recordKey: d.record_key,
          payload: d.payload as T,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch {
      // 로컬 폴백
    }
  }

  // 2. 로컬스토리지 폴백 조회
  let list = getLocalRecords<T>(organizationId, entityType);
  if (options?.recordKey) {
    list = list.filter((r) => r.recordKey === options.recordKey);
  }
  if (options?.referenceId) {
    list = list.filter((r) => r.referenceId === options.referenceId);
  }

  return list;
}

/**
 * 제네릭 엔터티 레코드 단건 삭제
 */
export async function deleteGenericEntityRecord(
  organizationId: string,
  entityType: string,
  recordId: string,
  supabaseClient?: any
): Promise<boolean> {
  // 1. Supabase DB 삭제 시도
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      const { error } = await supabaseClient
        .from('generic_entity_records')
        .delete()
        .eq('organization_id', organizationId)
        .eq('entity_type', entityType)
        .eq('id', recordId);

      if (!error) return true;
    } catch {
      // 로컬 폴백
    }
  }

  // 2. 로컬스토리지 폴백 삭제
  const existing = getLocalRecords(organizationId, entityType);
  const filtered = existing.filter((r) => r.id !== recordId);
  setLocalRecords(organizationId, entityType, filtered);
  return true;
}
