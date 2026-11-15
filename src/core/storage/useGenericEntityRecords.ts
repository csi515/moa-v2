import { useState, useEffect, useCallback, useTransition } from 'react';
import { useOptionalOrganization } from '../organizations/OrganizationProvider';
import { getCoreClient } from '../../lib/supabase';
import {
  listGenericEntityRecords,
  saveGenericEntityRecord,
  deleteGenericEntityRecord,
  type GenericEntityRecord,
} from './genericEntityStorage';

export interface UseGenericEntityRecordsOptions<T> {
  entityType: string;
  defaultRecords?: T[];
  recordKeyExtractor?: (item: T) => string | undefined;
  idExtractor?: (item: T) => string | undefined;
}

export interface UseGenericEntityRecordsResult<T> {
  records: T[];
  rawRecords: GenericEntityRecord<T>[];
  isLoading: boolean;
  saveRecord: (payload: T, recordKey?: string, id?: string) => Promise<GenericEntityRecord<T>>;
  deleteRecord: (idOrKey: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  organizationId: string | null;
}

/**
 * 18개 Long-tail Capability를 위한 전사 공통 클라우드 DB 연동 React Hook
 */
export function useGenericEntityRecords<T extends object>(
  options: UseGenericEntityRecordsOptions<T>
): UseGenericEntityRecordsResult<T> {
  const { entityType, defaultRecords = [], recordKeyExtractor, idExtractor } = options;
  const orgContext = useOptionalOrganization();
  const organizationId = orgContext?.currentOrganization?.id || 'default_org';

  const [rawRecords, setRawRecords] = useState<GenericEntityRecord<T>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  const supabaseClient = getCoreClient();

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listGenericEntityRecords<T>(organizationId, entityType, {
        supabaseClient,
      });

      if (items.length === 0 && defaultRecords.length > 0) {
        // 기본 레코드가 제공된 경우 초기 데이터로 변환
        const convertedDefaults: GenericEntityRecord<T>[] = defaultRecords.map((d, idx) => ({
          id: idExtractor ? idExtractor(d) : (d as any).id || `default_${idx}`,
          organizationId,
          entityType,
          recordKey: recordKeyExtractor ? recordKeyExtractor(d) : (d as any).menuCode || (d as any).code,
          payload: d,
        }));
        startTransition(() => {
          setRawRecords(convertedDefaults);
        });
      } else {
        startTransition(() => {
          setRawRecords(items);
        });
      }
    } catch {
      // 에러 시 기본 레코드 유지
      if (defaultRecords.length > 0) {
        const fallbackDefaults: GenericEntityRecord<T>[] = defaultRecords.map((d, idx) => ({
          id: idExtractor ? idExtractor(d) : (d as any).id || `fallback_${idx}`,
          organizationId,
          entityType,
          payload: d,
        }));
        setRawRecords(fallbackDefaults);
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, entityType, supabaseClient, defaultRecords, idExtractor, recordKeyExtractor]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const saveRecord = useCallback(
    async (payload: T, recordKey?: string, id?: string): Promise<GenericEntityRecord<T>> => {
      const targetId = id || (idExtractor ? idExtractor(payload) : (payload as any).id);
      const targetKey = recordKey || (recordKeyExtractor ? recordKeyExtractor(payload) : (payload as any).code);

      const recordToSave: GenericEntityRecord<T> = {
        id: targetId,
        organizationId,
        entityType,
        recordKey: targetKey,
        payload,
      };

      const saved = await saveGenericEntityRecord<T>(recordToSave, supabaseClient);

      startTransition(() => {
        setRawRecords((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id || (saved.recordKey && r.recordKey === saved.recordKey));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
      });

      return saved;
    },
    [organizationId, entityType, supabaseClient, idExtractor, recordKeyExtractor]
  );

  const deleteRecord = useCallback(
    async (idOrKey: string): Promise<boolean> => {
      const ok = await deleteGenericEntityRecord(organizationId, entityType, idOrKey, supabaseClient);
      if (ok) {
        startTransition(() => {
          setRawRecords((prev) => prev.filter((r) => r.id !== idOrKey && r.recordKey !== idOrKey));
        });
      }
      return ok;
    },
    [organizationId, entityType, supabaseClient]
  );

  const records = rawRecords.map((r) => {
    // payload 객체에 id를 보존하여 뷰 컴포넌트 편의 제공
    if (r.id && typeof r.payload === 'object' && !('id' in r.payload)) {
      return { ...r.payload, id: r.id } as T;
    }
    return r.payload;
  });

  return {
    records,
    rawRecords,
    isLoading,
    saveRecord,
    deleteRecord,
    refresh: fetchRecords,
    organizationId,
  };
}
