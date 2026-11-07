import { getCoreClient } from '@/lib/supabase';
import type { AddressSearchResult } from '../types';

export interface AddressSearchResponse {
  results: AddressSearchResult[];
  totalCount: number;
  currentPage: number;
  countPerPage: number;
  error?: string;
}

export async function searchAddress(
  keyword: string,
  options?: { currentPage?: number; countPerPage?: number }
): Promise<AddressSearchResponse> {
  const trimmed = keyword.trim();
  if (trimmed.length < 2) {
    return {
      results: [],
      totalCount: 0,
      currentPage: 1,
      countPerPage: options?.countPerPage ?? 10,
      error: '검색어는 최소 2자 이상이어야 합니다.',
    };
  }

  try {
    const { data, error } = await getCoreClient().functions.invoke('search-address', {
      body: {
        keyword: trimmed,
        currentPage: options?.currentPage ?? 1,
        countPerPage: options?.countPerPage ?? 10,
      },
    });

    if (error) {
      // Edge Function 비정상 응답 시 영문 시스템 에러(Edge Function returned a non-2xx...) 노출 차단
      return {
        results: [],
        totalCount: 0,
        currentPage: options?.currentPage ?? 1,
        countPerPage: options?.countPerPage ?? 10,
        error: '주소 검색 서비스 연결이 원활하지 않습니다. 직접 주소를 입력하여 바로 적용할 수 있습니다.',
      };
    }

    const payload = (data ?? {}) as AddressSearchResponse & { error?: string };
    if (payload.error && (!payload.results || payload.results.length === 0)) {
      return {
        results: [],
        totalCount: 0,
        currentPage: payload.currentPage ?? 1,
        countPerPage: payload.countPerPage ?? 10,
        error: '검색 결과가 없습니다. 직접 주소를 입력하여 바로 적용할 수 있습니다.',
      };
    }

    return {
      results: Array.isArray(payload.results) ? payload.results : [],
      totalCount: Number(payload.totalCount) || 0,
      currentPage: Number(payload.currentPage) || 1,
      countPerPage: Number(payload.countPerPage) || 10,
    };
  } catch {
    // 네트워크 오류 또는 예외 발생 시 안전한 폴백 안내 반환
    return {
      results: [],
      totalCount: 0,
      currentPage: options?.currentPage ?? 1,
      countPerPage: options?.countPerPage ?? 10,
      error: '주소 검색 중 오류가 발생했습니다. 직접 주소를 입력하여 바로 적용할 수 있습니다.',
    };
  }
}
