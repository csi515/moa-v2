import { DEFAULT_LOCATION_TIMEZONE } from '@/core/locations/types';

/** 브라우저 로컬 타임존 기준 날짜 유틸 (출결·레슨·대시보드 통일) */

export function todayIsoLocal(now: Date = new Date()): string {
  return formatIsoDateLocal(now);
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * YYYY-MM-DD 를 로컬 달력 날짜로 표시한다.
 * `new Date(iso).toISOString()` 파싱과 섞지 않는다.
 */
export function formatKoreanDateLocal(isoDate?: string | null): string {
  if (!isoDate) return '-';
  const ymd = isoDate.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const local = new Date(year, month - 1, day);
  if (Number.isNaN(local.getTime())) return isoDate;
  return `${year}년 ${month}월 ${day}일 (${WEEKDAY_KO[local.getDay()]})`;
}

export function yearMonthLocal(now: Date = new Date()): string {
  return formatIsoDateLocal(now).slice(0, 7);
}

export function formatIsoDateLocal(date: Date): string {
  return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function shiftDateIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatIsoDateLocal(d);
}

/** 로컬 달력 자정 */
export function startOfLocalDay(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 로컬 다음날 자정 (당일 조회 exclusive end) */
export function startOfNextLocalDay(now: Date = new Date()): Date {
  const d = startOfLocalDay(now);
  d.setDate(d.getDate() + 1);
  return d;
}

/** 로컬 기준 이번 주 월요일 YYYY-MM-DD */
export function weekStartIsoLocal(now: Date = new Date()): string {
  const d = startOfLocalDay(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatIsoDateLocal(d);
}

function formatDateParts(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function toInstant(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** IANA timezone. 없거나 유효하지 않으면 기존 기본 timezone 정책. */
export function resolveIanaTimezone(timezone?: string | null): string {
  const trimmed = timezone?.trim();
  if (!trimmed) return DEFAULT_LOCATION_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return DEFAULT_LOCATION_TIMEZONE;
  }
}

function timezoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';
  const asUtc = Date.UTC(
    Number(read('year')),
    Number(read('month')) - 1,
    Number(read('day')),
    Number(read('hour')),
    Number(read('minute')),
    Number(read('second'))
  );
  return asUtc - instant.getTime();
}

/** UTC instant → location timezone 기준 영업일 YYYY-MM-DD. UTC 날짜와 섞지 않는다. */
export function businessDateInTimezone(
  instant: Date | string = new Date(),
  timezone?: string | null
): string {
  const date = toInstant(instant);
  if (Number.isNaN(date.getTime())) {
    return typeof instant === 'string' ? instant.slice(0, 10) : '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveIanaTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function businessTimeInTimezone(
  instant: Date | string,
  timezone?: string | null
): string {
  const date = toInstant(instant);
  if (Number.isNaN(date.getTime())) {
    return typeof instant === 'string' ? instant.slice(11, 16) : '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: resolveIanaTimezone(timezone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** location 벽시계 시각을 UTC instant 로 변환 */
export function instantFromBusinessLocal(
  businessDate: string,
  time: string,
  timezone?: string | null
): Date {
  const tz = resolveIanaTimezone(timezone);
  const clock = time.length === 5 ? `${time}:00` : time;
  const utcGuess = Date.parse(`${businessDate}T${clock}Z`);
  if (Number.isNaN(utcGuess)) return new Date(NaN);
  let utc = utcGuess - timezoneOffsetMs(new Date(utcGuess), tz);
  const adjusted = timezoneOffsetMs(new Date(utc), tz);
  if (adjusted !== timezoneOffsetMs(new Date(utcGuess), tz)) {
    utc = utcGuess - adjusted;
  }
  return new Date(utc);
}
