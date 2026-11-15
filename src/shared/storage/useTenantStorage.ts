import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';

/**
 * 테넌트 격리가 보장되는 안전한 로컬 영속성 훅
 *
 * 브라우저 localStorage에 저장할 때 현재 활성 매장 ID(`currentOrganization.id`)를
 * 자동으로 키 네임스페이스(`moa:${orgId}:${key}`)에 바인딩하여, 매장 전환 시
 * 데이터가 섞이거나 누수되는 사고를 원천 방지합니다.
 */
export function useTenantStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || 'default';
  const tenantKey = `moa:${orgId}:${key}`;

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(tenantKey);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[useTenantStorage] '${tenantKey}' 읽기 실패, 기본값을 사용합니다:`, error);
      return initialValue;
    }
  }, [tenantKey, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 조직이 변경되거나 tenantKey가 바뀔 때 상태 동기화
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') return;

      try {
        setStoredValue((prev) => {
          const nextValue = value instanceof Function ? value(prev) : value;
          window.localStorage.setItem(tenantKey, JSON.stringify(nextValue));
          return nextValue;
        });
      } catch (error) {
        console.error(`[useTenantStorage] '${tenantKey}' 저장 실패:`, error);
      }
    },
    [tenantKey]
  );

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(tenantKey);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`[useTenantStorage] '${tenantKey}' 삭제 실패:`, error);
    }
  }, [tenantKey, initialValue]);

  return [storedValue, setValue, removeValue];
}
