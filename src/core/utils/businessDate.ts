/**
 * 글로벌 타임존 정규화 엔진 (Business Date Engine)
 * 
 * 목적:
 * 매장 설정(organizations.timezone, 기본 'Asia/Seoul')을 기반으로
 * - 자정 마감 정산 누락 방지 (23:59:59.999 boundary)
 * - 해외 브라우저 접속 시 날짜 어긋남 방지
 * - 만료일 D-Day 계산 왜곡 방지
 * 를 위한 결정론적 순수 함수 모듈.
 * 
 * 제약 조건:
 * - 외부 라이브러리(Moment.js 등) 금지, 네이티브 Intl.DateTimeFormat 활용.
 * - Pure Determinism: 함수 내부 `new Date()` 직접 호출을 지양하고 `now` 주입 가능.
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Asia/Seoul';

/**
 * 유효한 IANA 타임존 문자열로 정규화한다. 유효하지 않으면 기본값 반환.
 */
export function resolveBusinessTimezone(timezone?: string | null): string {
  const trimmed = timezone?.trim();
  if (!trimmed) return DEFAULT_BUSINESS_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: trimmed }).format(new Date(0));
    return trimmed;
  } catch {
    return DEFAULT_BUSINESS_TIMEZONE;
  }
}

function parseToDate(input: Date | string): Date {
  if (input instanceof Date) return input;
  // 단순 날짜 문자열(YYYY-MM-DD)인 경우 시각 정보 보충
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return new Date(`${input.trim()}T12:00:00Z`);
  }
  return new Date(input);
}

/**
 * 특정 UTC instant에서 대상 타임존의 오프셋(ms)을 계산한다.
 * offsetMs = 로컬시각(as UTC ms) - 실제 UTC ms
 */
function getTzOffsetMs(instantUtcMs: number, timeZone: string): number {
  // 밀리초 절삭 후 초 단위로 오프셋을 계산하여 ms 오차 방지
  const baseInstant = Math.floor(instantUtcMs / 1000) * 1000;
  const date = new Date(baseInstant);
  if (Number.isNaN(date.getTime())) return 0;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  let hour = get('hour');
  if (hour === 24) hour = 0;

  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  );

  return localAsUtc - baseInstant;
}

/**
 * 주어진 시각을 지정된 타임존 기준 YYYY-MM-DD 문자열로 반환한다.
 */
export function formatBusinessYmd(
  date: Date | string,
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = parseToDate(date);
  if (Number.isNaN(d.getTime())) return '';

  const tz = resolveBusinessTimezone(timezone);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * 해당 타임존 기준 당일 00:00:00.000의 UTC ISO 문자열 반환.
 * 
 * 예: Asia/Seoul (UTC+9) 기준 2026-10-25의 시작:
 * 2026-10-25 00:00:00.000 KST = 2026-10-24T15:00:00.000Z
 */
export function getBusinessStartOfDay(
  date: Date | string,
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  const tz = resolveBusinessTimezone(timezone);
  const ymd = formatBusinessYmd(date, tz);
  if (!ymd) return new Date(NaN).toISOString();

  const [yearStr, monthStr, dayStr] = ymd.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const localUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const approxOffset = getTzOffsetMs(localUtcMs, tz);
  let utcMs = localUtcMs - approxOffset;
  const exactOffset = getTzOffsetMs(utcMs, tz);
  if (exactOffset !== approxOffset) {
    utcMs = localUtcMs - exactOffset;
  }

  return new Date(utcMs).toISOString();
}

/**
 * 해당 타임존 기준 당일 23:59:59.999의 UTC ISO 문자열 반환 (일일 마감, 당일 매출 집계용).
 * 
 * 예: Asia/Seoul (UTC+9) 기준 2026-10-25의 마감:
 * 2026-10-25 23:59:59.999 KST = 2026-10-25T14:59:59.999Z
 */
export function getBusinessEndOfDay(
  date: Date | string,
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  const tz = resolveBusinessTimezone(timezone);
  const ymd = formatBusinessYmd(date, tz);
  if (!ymd) return new Date(NaN).toISOString();

  const [yearStr, monthStr, dayStr] = ymd.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const localUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const approxOffset = getTzOffsetMs(localUtcMs, tz);
  let utcMs = localUtcMs - approxOffset;
  const exactOffset = getTzOffsetMs(utcMs, tz);
  if (exactOffset !== approxOffset) {
    utcMs = localUtcMs - exactOffset;
  }

  return new Date(utcMs).toISOString();
}

/**
 * 타임존을 고려하여 두 시각이 같은 영업 날짜(Business Day)에 속하는지 판정.
 */
export function isSameBusinessDay(
  d1: Date | string,
  d2: Date | string,
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): boolean {
  const tz = resolveBusinessTimezone(timezone);
  const ymd1 = formatBusinessYmd(d1, tz);
  const ymd2 = formatBusinessYmd(d2, tz);
  return Boolean(ymd1 && ymd2 && ymd1 === ymd2);
}

/**
 * 수강권/이용권 만료 D-Day 계산.
 * 당일 자정(23:59:59.999) 전까지는 D-0(0일) 유지.
 * 
 * 반환값:
 * - 0: 당일 만료 (D-Day)
 * - > 0: 남은 일수 (예: 1은 내일 만료 D-1)
 * - < 0: 이미 만료됨 (예: -1은 어제 만료됨)
 */
export function calculateRemainingDays(
  expiresAt: Date | string,
  now: Date | string = new Date(),
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): number {
  const tz = resolveBusinessTimezone(timezone);
  const expireYmd = formatBusinessYmd(expiresAt, tz);
  const nowYmd = formatBusinessYmd(now, tz);

  if (!expireYmd || !nowYmd) return 0;

  const [ey, em, ed] = expireYmd.split('-').map(Number);
  const [ny, nm, nd] = nowYmd.split('-').map(Number);

  const expireDayIndex = Math.floor(Date.UTC(ey, em - 1, ed) / 86_400_000);
  const nowDayIndex = Math.floor(Date.UTC(ny, nm - 1, nd) / 86_400_000);

  return expireDayIndex - nowDayIndex;
}

/**
 * 지정된 타임존 기준 현재 날짜(YYYY-MM-DD) 반환.
 */
export function getBusinessToday(timezone: string = DEFAULT_BUSINESS_TIMEZONE): string {
  return formatBusinessYmd(new Date(), timezone);
}

/**
 * 프로젝트 표준 날짜 정규화 함수 (규칙 2_DATA_AND_SECURITY.md 제4조 명세).
 * 주어진 날짜(또는 현재 시각)를 지정된 사업장 타임존 기준 YYYY-MM-DD 문자열로 정규화.
 */
export function toBusinessDateString(
  date: Date | string = new Date(),
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  return formatBusinessYmd(date, timezone);
}

/**
 * 지정된 타임존 기준 현재 또는 특정 날짜의 YYYY-MM 반환.
 */
export function getBusinessYearMonth(
  date: Date | string = new Date(),
  timezone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  const ymd = formatBusinessYmd(date, timezone);
  return ymd ? ymd.slice(0, 7) : '';
}

