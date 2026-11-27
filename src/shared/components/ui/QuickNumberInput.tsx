import React, { useState, useEffect } from 'react';
import { Delete, X } from 'lucide-react';

export interface QuickNumberInputProps {
  /** 입력 목표 자릿수 (예: 4자리 핀/전화번호 뒷자리, 기본 4) */
  length?: number;
  /** 현재 값 (controlled 모드) */
  value?: string;
  /** 값 변경 핸들러 */
  onChange?: (value: string) => void;
  /** 목표 자릿수 도달 시 자동 완료 콜백 */
  onComplete?: (value: string) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 하단 온스크린 대형 숫자 키패드 노출 여부 (기본 true) */
  showKeypad?: boolean;
  /** 추가 클래스 */
  className?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * QuickNumberInput: 현장 카운터/키오스크용 대형 숫자 패드 인풋
 * 
 * - inputMode="numeric", pattern="[0-9]*" 강제로 모바일 쿼티 키보드 방지.
 * - text-2xl 중앙 정렬 대형 숫자 표시 및 원터치 지우기 버튼.
 * - 48px(h-12) 규격의 대형 터치 키패드 내장.
 * - 4자리 입력 시 햅틱 피드백 및 onComplete 즉시 트리거.
 */
export const QuickNumberInput: React.FC<QuickNumberInputProps> = ({
  length = 4,
  value: controlledValue,
  onChange,
  onComplete,
  placeholder = '••••',
  showKeypad = true,
  className = '',
  disabled = false,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;

  const updateValue = (next: string) => {
    if (disabled) return;
    const clamped = next.slice(0, length);
    if (controlledValue === undefined) {
      setInternalValue(clamped);
    }
    onChange?.(clamped);

    if (clamped.length === length) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {
          // Ignore vibration errors
        }
      }
      onComplete?.(clamped);
    }
  };

  const pressDigit = (digit: string) => {
    updateValue(currentValue + digit);
  };

  const clearAll = () => {
    updateValue('');
  };

  const backspace = () => {
    updateValue(currentValue.slice(0, -1));
  };

  return (
    <div className={`w-full max-w-sm mx-auto ${className}`}>
      {/* 대형 숫자 표시 인풋 필드 */}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          readOnly
          disabled={disabled}
          value={currentValue}
          placeholder={placeholder}
          aria-label="숫자 입력 필드"
          className="w-full h-14 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-center text-2xl font-bold tracking-[0.25em] text-slate-900 transition-colors focus:border-slate-900 focus:bg-white focus:outline-none disabled:opacity-50"
        />
        {currentValue.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="전체 지우기"
            className="absolute right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 현장용 대형 온스크린 숫자 키패드 (48px 엄지존 규격) */}
      {showKeypad && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 select-none touch-manipulation">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={disabled || currentValue.length >= length}
              onClick={() => pressDigit(digit)}
              className="h-14 sm:h-16 rounded-2xl bg-white border border-slate-200 text-2xl font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 active:bg-slate-100 transition-all disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* C (Clear 전체 지우기) */}
          <button
            type="button"
            disabled={disabled || currentValue.length === 0}
            onClick={clearAll}
            aria-label="전체 삭제"
            className="h-14 sm:h-16 rounded-2xl bg-slate-100 border border-slate-200 text-base font-bold text-slate-600 shadow-2xs hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40"
          >
            C
          </button>

          {/* 0 */}
          <button
            type="button"
            disabled={disabled || currentValue.length >= length}
            onClick={() => pressDigit('0')}
            className="h-14 sm:h-16 rounded-2xl bg-white border border-slate-200 text-2xl font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 active:bg-slate-100 transition-all disabled:opacity-40"
          >
            0
          </button>

          {/* Backspace (한 글자 지우기) */}
          <button
            type="button"
            disabled={disabled || currentValue.length === 0}
            onClick={backspace}
            aria-label="지우기"
            className="h-14 sm:h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shadow-2xs hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
