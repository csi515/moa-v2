import { DEFAULT_LOCATION_TIMEZONE } from '@/core/locations/types';
import { businessDateInTimezone, businessTimeInTimezone } from '@/shared/utils/localDate';

/** 기본 timezone(Asia/Seoul) 래퍼. 계산은 localDate 공통 규칙을 쓴다. */
export function toSeoulIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

export function seoulDateFromIso(iso: string): string {
  return businessDateInTimezone(iso, DEFAULT_LOCATION_TIMEZONE);
}

export function seoulTimeFromIso(iso: string): string {
  return businessTimeInTimezone(iso, DEFAULT_LOCATION_TIMEZONE);
}

export function dayRangeSeoul(date: string): { start: string; end: string } {
  return {
    start: `${date}T00:00:00+09:00`,
    end: `${date}T23:59:59.999+09:00`,
  };
}
