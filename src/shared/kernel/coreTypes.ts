/**
 * Core primitive types and Value Objects for Moa-v2
 * All domain layers (Core, Capability, Industry, Shared) can safely depend on this file.
 */

export type TenantId = string;
export type CustomerId = string;
export type StaffId = string;
export type UserId = string;

/** 통화 단위 (원화 KRW, 부동소수점 오차 방지 정수형) */
export type Money = number;

/** 로컬 날짜 문자열: YYYY-MM-DD */
export type LocalDateString = string;

/** 로컬 시간 문자열: HH:mm */
export type LocalTimeString = string;

/** ISO 8601 타임스탬프 */
export type IsoTimestamp = string;

/** 날짜 범위 */
export interface DateRange {
  startDate: LocalDateString;
  endDate: LocalDateString;
}

/** 공통 페이지네이션 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}
