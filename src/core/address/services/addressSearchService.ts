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

  const { data, error } = await getCoreClient().functions.invoke('search-address', {
    body: {
      keyword: trimmed,
      currentPage: options?.currentPage ?? 1,
      countPerPage: options?.countPerPage ?? 10,
    },
  });

  if (error) {
    return {
      results: [],
      totalCount: 0,
      currentPage: options?.currentPage ?? 1,
      countPerPage: options?.countPerPage ?? 10,
      error: error.message || '주소 검색에 실패했습니다.',
    };
  }

  const payload = (data ?? {}) as AddressSearchResponse & { error?: string };
  if (payload.error && (!payload.results || payload.results.length === 0)) {
    return {
      results: [],
      totalCount: 0,
      currentPage: payload.currentPage ?? 1,
      countPerPage: payload.countPerPage ?? 10,
      error: payload.error,
    };
  }

  return {
    results: Array.isArray(payload.results) ? payload.results : [],
    totalCount: Number(payload.totalCount) || 0,
    currentPage: Number(payload.currentPage) || 1,
    countPerPage: Number(payload.countPerPage) || 10,
  };
}
