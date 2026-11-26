import { useState, useEffect, useCallback, useRef } from 'react';
import { getCoreClient } from '@/lib/supabase';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';

export interface DuplicateCustomerInfo {
  id: string;
  name: string;
  phone: string;
  created_at?: string;
}

export interface UseDuplicateCustomerCheckResult {
  isChecking: boolean;
  isDuplicate: boolean;
  duplicateCustomer: DuplicateCustomerInfo | null;
  checkDuplicate: (phone: string) => Promise<boolean>;
  resetCheck: () => void;
}

/**
 * useDuplicateCustomerCheck
 * 신규 고객/원생 등록 시 전화번호 중복 여부를 실시간으로 감지합니다.
 * @param inputPhone 입력 중인 전화번호 (문자열)
 * @param debounceMs 디바운스 대기 시간 (기본 350ms)
 */
export function useDuplicateCustomerCheck(
  inputPhone: string,
  debounceMs: number = 350
): UseDuplicateCustomerCheckResult {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState<DuplicateCustomerInfo | null>(null);

  const org = useOptionalOrganization();
  const organizationId = org?.currentOrganization?.id;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCheck = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsChecking(false);
    setIsDuplicate(false);
    setDuplicateCustomer(null);
  }, []);

  const performCheck = useCallback(
    async (rawPhone: string): Promise<boolean> => {
      const digits = rawPhone.replace(/\D/g, '');
      if (digits.length < 9 || !organizationId) {
        setIsDuplicate(false);
        setDuplicateCustomer(null);
        return false;
      }

      setIsChecking(true);
      try {
        const client = getCoreClient();
        // customers 테이블에서 동일 organization_id 및 phone 검색
        const { data, error } = await client
          .from('customers')
          .select('id, name, phone, created_at')
          .eq('organization_id', organizationId)
          .eq('phone', digits)
          .limit(1);

        if (error) {
          // RLS 또는 테이블 미존재 시 무음 처리
          setIsChecking(false);
          return false;
        }

        if (data && data.length > 0) {
          const match = (data as Array<Record<string, unknown>>)[0];
          setIsDuplicate(true);
          setDuplicateCustomer({
            id: String(match.id || ''),
            name: String(match.name || ''),
            phone: String(match.phone || match.parent_phone || digits),
            created_at: match.created_at ? String(match.created_at) : undefined,
          });
          setIsChecking(false);
          return true;
        } else {
          setIsDuplicate(false);
          setDuplicateCustomer(null);
          setIsChecking(false);
          return false;
        }
      } catch {
        setIsChecking(false);
        return false;
      }
    },
    [organizationId]
  );

  useEffect(() => {
    const digits = inputPhone.replace(/\D/g, '');
    if (digits.length < 9) {
      resetCheck();
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      performCheck(digits);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputPhone, debounceMs, performCheck, resetCheck]);

  return {
    isChecking,
    isDuplicate,
    duplicateCustomer,
    checkDuplicate: performCheck,
    resetCheck,
  };
}
