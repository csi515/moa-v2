import React, { useId, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** 라벨 아래 힌트 문구. false면 숨김 */
  showHint?: boolean;
}

/** 숫자만 추출해 YYYY-MM-DD 형태로 포맷 */
export function formatBirthDateDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** 생년월일: 숫자 직접 입력 + 선택적 달력 */
export const BirthDateInput: React.FC<Props> = ({
  id,
  value,
  onChange,
  className = '',
  showHint = true,
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  return (
    <div className={className}>
      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="2017-05-12"
          value={value}
          onChange={(e) => onChange(formatBirthDateDigits(e.target.value))}
          maxLength={10}
          aria-describedby={showHint ? `${inputId}-hint` : undefined}
          className="w-full px-3 py-2.5 pr-12 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px] placeholder:text-slate-300 tracking-wide"
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-1.5 inline-flex items-center justify-center w-10 h-10 text-slate-400 hover:text-indigo-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="달력에서 선택"
        >
          <Calendar className="w-4 h-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      </div>
      {showHint && (
        <p id={`${inputId}-hint`} className="mt-1 text-[11px] text-slate-400">
          예: 2017-05-12 (숫자만 입력해도 됩니다)
        </p>
      )}
    </div>
  );
};
