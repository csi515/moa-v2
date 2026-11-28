import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTable } from '@refinedev/core';
import { pointQueryService } from '@/capabilities/commerce';
import { createTenantQueryKey } from '@/core/query/queryKeyFactory';

export type RetailCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  memo: string | null;
  metadata?: unknown;
};

const PAGE_SIZE = 300;

function asRow(value: unknown): RetailCustomerRow | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return {
    id: row.id,
    name: row.name,
    phone: typeof row.phone === 'string' ? row.phone : null,
    memo: typeof row.memo === 'string' ? row.memo : null,
    metadata: row.metadata,
  };
}

/**
 * 소매 고객 허브 목록. Refine useTable + 테넌트 쿼리 키로 읽는다.
 */
export function useRetailCustomerDirectory(orgId: string | undefined) {
  const listQueryKey = orgId
    ? createTenantQueryKey(orgId, 'customers', 'retail-hub', { pageSize: PAGE_SIZE })
    : null;

  const { tableQuery } = useTable<RetailCustomerRow>({
    resource: 'customers',
    syncWithLocation: false,
    pagination: { pageSize: PAGE_SIZE },
    sorters: { initial: [{ field: 'name', order: 'asc' }] },
    queryOptions: {
      enabled: Boolean(orgId),
      ...(listQueryKey ? { queryKey: [...listQueryKey] } : {}),
    },
  });

  const customers = useMemo(() => {
    const rows = tableQuery.data?.data ?? [];
    return rows.map(asRow).filter((row): row is RetailCustomerRow => row !== null);
  }, [tableQuery.data]);

  const customerIdsKey = customers.map((row) => row.id).join(',');
  const [balances, setBalances] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const ids = customerIdsKey ? customerIdsKey.split(',') : [];
    if (!orgId || ids.length === 0) {
      setBalances(new Map());
      return;
    }
    let cancelled = false;
    void pointQueryService
      .getPointBalances(orgId, ids)
      .then((map) => {
        if (!cancelled) setBalances(map);
      })
      .catch(() => {
        if (!cancelled) setBalances(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, customerIdsKey]);

  const refreshBalances = useCallback(async () => {
    const ids = customerIdsKey ? customerIdsKey.split(',') : [];
    if (!orgId || ids.length === 0) {
      setBalances(new Map());
      return;
    }
    const map = await pointQueryService.getPointBalances(orgId, ids);
    setBalances(map);
  }, [orgId, customerIdsKey]);

  const refetch = useCallback(async () => {
    await tableQuery.refetch();
    await refreshBalances();
  }, [tableQuery, refreshBalances]);

  return {
    customers,
    balances,
    loading: Boolean(tableQuery.isLoading),
    refetch,
    refreshBalances,
    listQueryKey,
  };
}
