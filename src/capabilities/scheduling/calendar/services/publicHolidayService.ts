import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { getFallbackPublicHolidays } from '../fallbackHolidays';
import type { PublicHolidayItem } from '../types';

interface ApiHoliday {
  dateName: string;
  locdate: string;
  isHoliday?: boolean;
}

interface HolidayApiResponse {
  holidays?: ApiHoliday[];
  error?: string;
}

const memoryCache = new Map<number, PublicHolidayItem[]>();
const STORAGE_PREFIX = 'moa:public-holidays:';

function locdateToIso(locdate: string): string | null {
  const raw = locdate.replace(/\D/g, '');
  if (raw.length !== 8) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function normalizeApiHolidays(items: ApiHoliday[]): PublicHolidayItem[] {
  const byDate = new Map<string, string>();
  for (const item of items) {
    if (item.isHoliday === false) continue;
    const date = locdateToIso(item.locdate);
    const name = item.dateName?.trim();
    if (!date || !name) continue;
    byDate.set(date, name);
  }
  return Array.from(byDate.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function readStored(year: number): PublicHolidayItem[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${year}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicHolidayItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(year: number, holidays: PublicHolidayItem[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${year}`, JSON.stringify(holidays));
  } catch {
    // ignore quota
  }
}

async function fetchFromApi(year: number): Promise<PublicHolidayItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getCoreClient().functions.invoke<HolidayApiResponse>(
    'get-public-holidays',
    { body: { solYear: year, operation: 'getRestDeInfo' } }
  );
  if (error || !data?.holidays?.length) return null;
  const normalized = normalizeApiHolidays(data.holidays);
  return normalized.length > 0 ? normalized : null;
}

/** 연도별 공휴일. API → 캐시 → 로컬 폴백 순. */
export async function fetchPublicHolidays(year: number): Promise<PublicHolidayItem[]> {
  if (memoryCache.has(year)) return memoryCache.get(year)!;

  const stored = readStored(year);
  if (stored) {
    memoryCache.set(year, stored);
    // 백그라운드 갱신
    void fetchFromApi(year).then((fresh) => {
      if (!fresh) return;
      memoryCache.set(year, fresh);
      writeStored(year, fresh);
    });
    return stored;
  }

  try {
    const fromApi = await fetchFromApi(year);
    if (fromApi) {
      memoryCache.set(year, fromApi);
      writeStored(year, fromApi);
      return fromApi;
    }
  } catch {
    // fallback below
  }

  const fallback = getFallbackPublicHolidays(year);
  memoryCache.set(year, fallback);
  return fallback;
}

export function holidaysForMonth(
  holidays: PublicHolidayItem[],
  year: number,
  month: number
): PublicHolidayItem[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return holidays.filter((h) => h.date.startsWith(prefix));
}

export function holidaysOnDate(
  holidays: PublicHolidayItem[],
  dateStr: string
): PublicHolidayItem[] {
  return holidays.filter((h) => h.date === dateStr);
}
