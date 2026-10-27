/**
 * Passes Filter Predicate (Pure Domain Function)
 *
 * 실무자 기준의 이용권/회원권 상태 판정 및 검색 필터링 순수 술어 함수입니다.
 * - DB 단순 문자열 비교로 인한 엣지케이스(잔여 0회, 날짜 만료 등)를 해결합니다.
 * - 시간 독립성(Pure Determinism)을 위해 now 기준 시각을 주입받습니다.
 * - 외부 부수효과(스토리지, 네트워크)가 없는 순수 함수입니다.
 */

import type { PassRecord } from '../services/passesService';
import type { PassStatus, PassType } from './passesEngine';

export type PassesStatusFilter = 'ALL' | PassStatus;

export interface PassesFilterCriteria {
  status?: PassesStatusFilter;
  searchQuery?: string;
  passType?: 'ALL' | PassType;
}

/**
 * 날짜 문자열을 Date 객체로 안전하게 파싱합니다.
 * YYYY-MM-DD 형식인 경우 해당 날짜의 23:59:59.999(자정 직전)까지 유효하도록 변환합니다.
 */
export function parseExpiryDate(expiryStr: string): Date {
  const trimmed = expiryStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  return new Date(trimmed);
}

/**
 * 실무자 기준의 실효 상태(Effective Status)를 판정합니다.
 *
 * 판정 우선순위:
 * 1. 일시정지 (PAUSED): 관리자에 의해 일시정지된 상태 유지
 * 2. 기간만료 (EXPIRED): 기준 시각(now)이 유효기간(expires_at)을 초과한 경우
 * 3. 잔여소진 (EXHAUSTED): 횟수제/복합권에서 잔여 횟수가 0 이하인 경우
 * 4. 이용가능 (ACTIVE): 유효기간 내에 잔여 횟수(또는 기간제)가 남아있는 정상 상태
 */
export function resolveEffectivePassStatus(
  item: Pick<PassRecord, 'status' | 'expires_at' | 'remaining_count' | 'pass_type'>,
  now: Date | string = new Date()
): PassStatus {
  if (item.status === 'PAUSED') {
    return 'PAUSED';
  }

  const baseDate = typeof now === 'string' ? new Date(now) : now;

  if (item.expires_at) {
    const expiryDate = parseExpiryDate(item.expires_at);
    if (!isNaN(expiryDate.getTime()) && baseDate.getTime() > expiryDate.getTime()) {
      return 'EXPIRED';
    }
  }

  const isPeriodOnly = item.pass_type === 'PERIOD_BASED';
  if (!isPeriodOnly && (item.remaining_count <= 0 || item.status === 'EXHAUSTED')) {
    return 'EXHAUSTED';
  }

  return 'ACTIVE';
}

/**
 * 단일 이용권이 주어진 필터 조건에 부합하는지 판정하는 순수 술어(Predicate) 함수
 */
export function matchesPassesFilter(
  item: PassRecord,
  filter: PassesFilterCriteria,
  now: Date | string = new Date()
): boolean {
  const targetStatus = filter.status ?? 'ALL';
  if (targetStatus !== 'ALL') {
    const effectiveStatus = resolveEffectivePassStatus(item, now);
    if (effectiveStatus !== targetStatus) {
      return false;
    }
  }

  const targetType = filter.passType ?? 'ALL';
  if (targetType !== 'ALL' && item.pass_type !== targetType) {
    return false;
  }

  const query = (filter.searchQuery ?? '').trim().toLowerCase();
  if (!query) {
    return true;
  }

  const cleanQuery = query.replace(/[-\s]/g, '');

  const nameMatch = (item.customer_name ?? '').toLowerCase().includes(query);
  const passNameMatch = (item.pass_name ?? '').toLowerCase().includes(query);

  const rawPhone = item.customer_phone ?? '';
  const cleanPhone = rawPhone.replace(/[-\s]/g, '');
  const phoneMatch =
    rawPhone.toLowerCase().includes(query) || (cleanPhone.length > 0 && cleanPhone.includes(cleanQuery));

  return nameMatch || passNameMatch || phoneMatch;
}

/**
 * 이용권 목록을 필터링하는 도메인 편의 함수
 */
export function filterPasses(
  items: readonly PassRecord[],
  filter: PassesFilterCriteria,
  now: Date | string = new Date()
): PassRecord[] {
  return items.filter((item) => matchesPassesFilter(item, filter, now));
}
