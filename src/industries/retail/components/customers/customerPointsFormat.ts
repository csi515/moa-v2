import type { PointTransaction } from '@/capabilities/commerce';
import { formatKoreanDate } from '@/utils/formatters';
import { formatSaleNumber } from '../../types/sale';
import { RETAIL_CUSTOMER_COPY as COPY } from './customerCopy';

export function formatPointAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('ko-KR');
  if (amount > 0) return `+${abs}${COPY.pointsUnit}`;
  if (amount < 0) return `-${abs}${COPY.pointsUnit}`;
  return `0${COPY.pointsUnit}`;
}

export function formatPointDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const date = formatKoreanDate(iso);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function saleRefLabel(tx: PointTransaction): string | null {
  if (tx.referenceType !== 'sale' || !tx.referenceId) return null;
  return formatSaleNumber(tx.referenceId);
}
