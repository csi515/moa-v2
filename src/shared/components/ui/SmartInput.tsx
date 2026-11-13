import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { cn } from '@/shared/lib/utils';

export type SmartInputType = 'text' | 'phone' | 'currency' | 'bizno' | 'birthdate';

export interface SmartInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  smartType?: SmartInputType;
  label?: string;
  error?: string;
  helperText?: string;
  value?: string | number;
  onChange?: (raw: string, formatted: string) => void;
  required?: boolean;
}

// 전화번호 포맷터 (010-1234-5678 / 02-123-4567)
export function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.startsWith('02')) {
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// 사업자등록번호 포맷터 (123-45-67890)
export function formatBizNo(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
}

// 생년월일 포맷터 (1999-01-01)
export function formatBirthdate(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// 금액 포맷터 (1,000,000)
export function formatCurrency(val: string | number): string {
  const num = typeof val === 'number' ? val : parseInt(val.toString().replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
}

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  (
    {
      smartType = 'text',
      label,
      error,
      helperText,
      value = '',
      onChange,
      required,
      className,
      disabled,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `smart-input-${label.replace(/\s+/g, '-')}` : undefined);
    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current!);

    const getDisplayValue = (): string => {
      const strVal = value !== undefined && value !== null ? value.toString() : '';
      if (!strVal) return '';

      switch (smartType) {
        case 'phone':
          return formatPhoneNumber(strVal);
        case 'bizno':
          return formatBizNo(strVal);
        case 'birthdate':
          return formatBirthdate(strVal);
        case 'currency':
          return formatCurrency(strVal);
        default:
          return strVal;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const inputVal = input.value;
      const prevCursor = input.selectionStart || 0;

      if (!onChange) return;

      if (smartType === 'phone') {
        const raw = inputVal.replace(/\D/g, '').slice(0, 11);
        const formatted = formatPhoneNumber(raw);
        onChange(raw, formatted);
        preserveCursor(input, prevCursor, inputVal, formatted);
      } else if (smartType === 'bizno') {
        const raw = inputVal.replace(/\D/g, '').slice(0, 10);
        const formatted = formatBizNo(raw);
        onChange(raw, formatted);
        preserveCursor(input, prevCursor, inputVal, formatted);
      } else if (smartType === 'birthdate') {
        const raw = inputVal.replace(/\D/g, '').slice(0, 8);
        const formatted = formatBirthdate(raw);
        onChange(raw, formatted);
        preserveCursor(input, prevCursor, inputVal, formatted);
      } else if (smartType === 'currency') {
        const raw = inputVal.replace(/\D/g, '');
        const formatted = formatCurrency(raw);
        onChange(raw, formatted);
        preserveCursor(input, prevCursor, inputVal, formatted);
      } else {
        onChange(inputVal, inputVal);
      }
    };

    // 포맷팅 후 커서 점프 방지 (Caret preservation)
    const preserveCursor = (
      input: HTMLInputElement,
      prevCursor: number,
      prevVal: string,
      nextVal: string
    ) => {
      requestAnimationFrame(() => {
        if (!input) return;
        const diff = nextVal.length - prevVal.length;
        const newPos = Math.max(0, Math.min(prevCursor + diff, nextVal.length));
        input.setSelectionRange(newPos, newPos);
      });
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 select-none"
          >
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            {...props}
            ref={innerRef}
            id={inputId}
            disabled={disabled}
            type="text"
            value={getDisplayValue()}
            onChange={handleChange}
            placeholder={
              placeholder ||
              (smartType === 'phone'
                ? '010-0000-0000'
                : smartType === 'bizno'
                ? '000-00-00000'
                : smartType === 'birthdate'
                ? 'YYYY-MM-DD'
                : smartType === 'currency'
                ? '0원'
                : '')
            }
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2',
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
              disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed',
              smartType === 'currency' && 'text-right font-mono pr-8',
              className
            )}
          />
          {smartType === 'currency' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              원
            </span>
          )}
        </div>
        {error ? (
          <p className="text-[11px] font-medium text-rose-600 animate-in fade-in duration-100">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';
