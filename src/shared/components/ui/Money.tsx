import React from 'react';
import { formatCurrency, formatWon } from '@/utils/formatters';

export interface MoneyProps {
  /** 금액 (숫자 또는 파싱 가능한 문자열) */
  amount: number | string | null | undefined;
  /**
   * 표기 형식:
   * - 'krw' (기본값): ₩10,000
   * - 'won': 10,000원
   * - 'plain': 10,000
   */
  format?: 'krw' | 'won' | 'plain';
  /** 양수일 때 '+' 기호 명시 여부 (예: +₩10,000) */
  showPositiveSign?: boolean;
  /** 추가 Tailwind 클래스 */
  className?: string;
  /** 빈 값이나 0일 때 대체 텍스트 (예: '무료' 또는 '-') */
  fallbackText?: string;
}

/**
 * 금액 및 수치 타이포그래피 표준 컴포넌트.
 * 고정폭 숫자(`tabular-nums font-mono`)를 내장하여 변동 시 레이아웃 흔들림(Jitter)을 방지합니다.
 */
export const Money: React.FC<MoneyProps> = ({
  amount,
  format = 'krw',
  showPositiveSign = false,
  className = '',
  fallbackText,
}) => {
  if (amount === null || amount === undefined || amount === '') {
    return <span className={`tabular-nums ${className}`}>{fallbackText ?? '-'}</span>;
  }

  const numericValue = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^0-9.-]/g, ''));

  if (isNaN(numericValue)) {
    return <span className={`tabular-nums ${className}`}>{fallbackText ?? '-'}</span>;
  }

  if (numericValue === 0 && fallbackText) {
    return <span className={`tabular-nums ${className}`}>{fallbackText}</span>;
  }

  let formatted = '';
  const absValue = Math.abs(numericValue);

  switch (format) {
    case 'won':
      formatted = formatWon(absValue);
      break;
    case 'plain':
      formatted = absValue.toLocaleString('ko-KR');
      break;
    case 'krw':
    default:
      formatted = formatCurrency(absValue);
      break;
  }

  const isNegative = numericValue < 0;
  const isPositive = numericValue > 0;
  const signPrefix = isNegative ? '-' : isPositive && showPositiveSign ? '+' : '';

  return (
    <span className={`inline-block tabular-nums font-mono tracking-tight ${className}`}>
      {`${signPrefix}${formatted}`}
    </span>
  );
};
