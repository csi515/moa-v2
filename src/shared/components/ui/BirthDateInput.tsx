import React, { useId, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatBirthdate } from './SmartInput';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** 라벨 아래 힌트 문구. false면 숨김 */
  showHint?: boolean;
}

/** 숫자만 추출해 YYYY-MM-DD 형태로 포맷 (SmartInput 공통 엔진으로 단일화) */
export function formatBirthDateDigits(raw: string): string {
  return formatBirthdate(raw);
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
          aria-label="달력에서 생년월일 선택"
          className="absolute right-2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
        >
          <Calendar className="w-5 h-5" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value.length === 10 ? value : ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          className="sr-only pointer-events-none"
        />
      </div>
      {showHint && (
        <p id={`${inputId}-hint`} className="text-[11px] text-slate-400 mt-1 pl-1">
          숫자 8자리(예: 20170512)를 입력하면 자동으로 하이픈이 들어갑니다.
        </p>
      )}
    </div>
  );
};
