import { useEffect, useState } from 'react';
import { fetchPublicHolidays } from './services/publicHolidayService';
import type { PublicHolidayItem } from './types';

/** 연도 변경 시 공휴일 목록 로드 */
export function usePublicHolidays(year: number): PublicHolidayItem[] {
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicHolidays(year).then((list) => {
      if (!cancelled) setHolidays(list);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  return holidays;
}
