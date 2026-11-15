import { useMemo } from 'react';
import { useList, type UseListProps } from '@refinedev/core';
import type { BaseRecord, CrudFilter, HttpError } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantColumnForResource, isTenantScopedResource } from '@/providers/dataProvider';
import type { ResourceRow } from './types';

export interface UseMoaListOptions<TRecord extends BaseRecord = BaseRecord>
  extends Omit<UseListProps<TRecord, HttpError, TRecord>, 'resource'> {
  /** 수동 리소스 스키마 (예: meta: { schema: 'piano' }) */
  schema?: string;
  /** 테넌트 자동 필터링 비활성화 여부 (기본값: false) */
  disableTenantFilter?: boolean;
}

export interface UseMoaListReturn<TRecord extends BaseRecord = BaseRecord> {
  /** 평탄화(Unwrapped)된 레코드 배열 */
  records: TRecord[];
  /** 데이터 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 객체 */
  error: HttpError | null;
  /** 데이터 재조회 함수 */
  refetch: () => void;
  /** 전체 아이템 수 */
  totalCount: number;
}

/**
 * Moa-v2 표준 단순 리스트 조회 훅 (셀렉트 박스, 통계, 카드 목록 전용)
 */
export function useMoaList<
  TResource extends string,
  TRecord extends BaseRecord = ResourceRow<TResource> extends BaseRecord
    ? ResourceRow<TResource>
    : BaseRecord
>(
  resource: TResource,
  options: UseMoaListOptions<TRecord> = {}
): UseMoaListReturn<TRecord> {
  const { currentOrganization } = useOrganization();
  const { schema, disableTenantFilter = false, filters: userFilters, meta: userMeta, ...restOptions } = options;

  const filters = useMemo(() => {
    const combinedFilters: CrudFilter[] = [...(userFilters || [])];

    if (!disableTenantFilter && currentOrganization?.id && isTenantScopedResource(resource)) {
      const tenantColumn = getTenantColumnForResource(resource);
      const hasTenantFilter = combinedFilters.some(
        (f) => 'field' in f && f.field === tenantColumn
      );
      if (!hasTenantFilter) {
        combinedFilters.push({
          field: tenantColumn,
          operator: 'eq',
          value: currentOrganization.id,
        });
      }
    }

    return combinedFilters;
  }, [resource, currentOrganization?.id, disableTenantFilter, userFilters]);

  const meta = useMemo(() => {
    return {
      ...(schema ? { schema } : {}),
      ...userMeta,
    };
  }, [schema, userMeta]);

  const { query } = useList<TRecord, HttpError>({
    resource,
    filters,
    meta,
    queryOptions: {
      enabled: disableTenantFilter || !!currentOrganization?.id,
      ...restOptions.queryOptions,
    },
    ...restOptions,
  });

  const records = useMemo(() => {
    return (query?.data?.data as TRecord[]) || [];
  }, [query?.data?.data]);

  const totalCount = query?.data?.total ?? records.length;

  return {
    records,
    isLoading: query?.isLoading ?? false,
    error: (query?.error as HttpError) ?? null,
    refetch: () => {
      void query?.refetch();
    },
    totalCount,
  };
}
