import { useMemo } from 'react';
import { useTable, type useTableProps } from '@refinedev/core';
import type { BaseRecord, CrudFilter, HttpError } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getTenantColumnForResource, isTenantScopedResource } from '@/providers/dataProvider';
import type { ResourceRow } from './types';

export interface UseMoaTableOptions<TRecord extends BaseRecord = BaseRecord>
  extends Omit<useTableProps<TRecord, HttpError>, 'resource'> {
  /** 수동 리소스 스키마 (예: meta: { schema: 'piano' }) */
  schema?: string;
  /** 테넌트 자동 필터링 비활성화 여부 (기본값: false) */
  disableTenantFilter?: boolean;
}

export interface UseMoaTableReturn<TRecord extends BaseRecord = BaseRecord> {
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
  /** 현재 페이지 (1-based) */
  currentPage: number;
  /** 페이지 수 */
  pageCount: number;
  /** 페이지 변경 핸들러 */
  setCurrentPage: (page: number) => void;
  /** 페이지 크기 변경 핸들러 */
  setPageSize: (size: number) => void;
  /** 현재 페이지 크기 */
  pageSize: number;
  /** 원본 Refine tableProps (Ant Design / Tailwind 테이블 바인딩용) */
  tableProps: ReturnType<typeof useTable<TRecord, HttpError>>['tableProps'];
  /** 원본 Refine useTable 반환 객체 */
  tableResult: ReturnType<typeof useTable<TRecord, HttpError>>;
}

/**
 * Moa-v2 표준 테이블 데이터 조회 훅 (<AutoDataTable /> 및 일반 테이블 뷰 전용)
 *
 * 특징:
 * 1. 테넌트 격리(organization_id / tenant_id) 필터를 안전하게 자동 주입
 * 2. 타입 세이프한 records 레코드 배열 즉시 반환 (as any 제거)
 * 3. 페이징 및 리프레시 상태 평탄화
 */
export function useMoaTable<
  TResource extends string,
  TRecord extends BaseRecord = ResourceRow<TResource> extends BaseRecord
    ? ResourceRow<TResource>
    : BaseRecord
>(
  resource: TResource,
  options: UseMoaTableOptions<TRecord> = {}
): UseMoaTableReturn<TRecord> {
  const { currentOrganization } = useOrganization();
  const { schema, disableTenantFilter = false, filters: userFilters, meta: userMeta, ...restOptions } = options;

  // 테넌트 필터 자동 구성
  const filters = useMemo(() => {
    const combinedFilters: CrudFilter[] = [...(userFilters?.initial || [])];

    if (!disableTenantFilter && currentOrganization?.id && isTenantScopedResource(resource)) {
      const tenantColumn = getTenantColumnForResource(resource);
      // 이미 사용자가 동일 필드를 지정하지 않은 경우에만 자동 주입
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

    return {
      ...userFilters,
      initial: combinedFilters,
    };
  }, [resource, currentOrganization?.id, disableTenantFilter, userFilters]);

  const meta = useMemo(() => {
    return {
      ...(schema ? { schema } : {}),
      ...userMeta,
    };
  }, [schema, userMeta]);

  const tableResult = useTable<TRecord, HttpError>({
    resource,
    filters,
    meta,
    queryOptions: {
      enabled: disableTenantFilter || !!currentOrganization?.id,
      ...restOptions.queryOptions,
    },
    ...restOptions,
  });

  const { tableProps, tableQuery, current, setCurrent, pageSize, setPageSize, pageCount } =
    tableResult;

  const records = useMemo(() => {
    return (tableQuery?.data?.data as TRecord[]) || [];
  }, [tableQuery?.data?.data]);

  const totalCount = tableQuery?.data?.total ?? records.length;

  return {
    records,
    isLoading: tableQuery?.isLoading ?? false,
    error: (tableQuery?.error as HttpError) ?? null,
    refetch: () => {
      void tableQuery?.refetch();
    },
    totalCount,
    currentPage: current,
    pageCount: pageCount || 1,
    setCurrentPage: setCurrent,
    pageSize,
    setPageSize,
    tableProps,
    tableResult,
  };
}
