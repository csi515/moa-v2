import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** 디바운스 적용 지연 시간 (밀리초 단위, 지정하지 않으면 즉시 동기 반영) */
  debounceMs?: number;
  /** 검색어 삭제 시 추가 콜백 */
  onClear?: () => void;
  'aria-label'?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = '검색...',
  className = '',
  debounceMs,
  onClear,
  'aria-label': ariaLabel,
}) => {
  // 디바운스 모드 지원을 위한 내부 인풋 상태
  const [internalValue, setInternalValue] = useState(value);
  const isFirstRender = useRef(true);

  // 외부 value 동기화
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // 디바운스 타이머 처리
  useEffect(() => {
    if (debounceMs === undefined || debounceMs <= 0) {
      return;
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [internalValue, debounceMs, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInternalValue(next);
    if (!debounceMs || debounceMs <= 0) {
      onChange(next);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    onChange('');
    onClear?.();
  };

  const hasValue = Boolean(internalValue && internalValue.length > 0);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        aria-label={ariaLabel || placeholder}
        className={`w-full pl-8 ${
          hasValue ? 'pr-9' : 'pr-3'
        } py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors`}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="검색어 지우기"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
