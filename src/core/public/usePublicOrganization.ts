import { useEffect, useState } from 'react';
import type { PublicOrgInfo } from '@/types';
import { normalizeIndustryType } from '@/core/industry/types';
import { getPlaceLabel, isAppointmentIndustry } from '@/core/industry/industryUi';
import { supabase } from '@/lib/supabase/client';
import { publicOrgService } from './services/publicOrgService';

/**
 * 공개 랜딩: 조직 조회 + 인증 세션 확인.
 * 스케줄 조회는 조직 성공 이후에만 호출되도록 페이지/섹션에서 연결한다.
 */
export function usePublicOrganization(code: string) {
  const [org, setOrg] = useState<PublicOrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function fetchOrg() {
      try {
        setLoading(true);
        setError(null);
        const data = await publicOrgService.getOrganizationByCode(code);
        if (!data) {
          setError('조직을 찾을 수 없습니다');
          setOrg(null);
        } else {
          setOrg(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '조직 정보를 가져오는데 실패했습니다');
        setOrg(null);
      } finally {
        setLoading(false);
      }
    }

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    }

    fetchOrg();
    checkAuth();
  }, [code]);

  const placeLabel = getPlaceLabel(org?.industry_type);
  const adultFirst =
    !!org &&
    (isAppointmentIndustry(org.industry_type) ||
      normalizeIndustryType(org.industry_type) === 'gym');

  return {
    org,
    loading,
    error,
    isAuthenticated,
    placeLabel,
    adultFirst,
  };
}
