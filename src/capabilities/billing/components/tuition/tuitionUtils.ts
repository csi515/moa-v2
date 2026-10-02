/** YYYY-MM 형식의 현재 월 */
export function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** 청구월 + 납부일 → dueDate (YYYY-MM-DD) */
export function defaultDueDateForMonth(yearMonth: string, paymentDay = 10): string {
  const day = String(Math.min(28, Math.max(1, paymentDay))).padStart(2, '0');
  return `${yearMonth}-${day}`;
}

/** YYYY-MM → "2026년 8월" */
export function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  if (!y || !m) return yearMonth;
  return `${y}년 ${parseInt(m, 10)}월`;
}
