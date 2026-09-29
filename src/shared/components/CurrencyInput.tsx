import React from 'react';
import { formatNumberWithCommas, parseNumberFromFormatted } from '@/utils/formatters';

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  showQuickButtons?: boolean;
  autoFocus?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = '0',
  className = '',
  disabled = false,
  required = false,
  min = 0,
  max,
  showQuickButtons = false,
  autoFocus = false
}) => {
  const displayValue = formatNumberWithCommas(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const num = parseNumberFromFormatted(rawVal);
    if (max !== undefined && num > max) {
      onChange(max);
      return;
    }
    onChange(num);
  };

  const handleAddAmount = (add: number) => {
    const current = typeof value === 'number' ? value : parseNumberFromFormatted(String(value));
    const nextVal = current + add;
    if (max !== undefined && nextVal > max) {
      onChange(max);
      return;
    }
    onChange(nextVal);
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-xs sm:text-sm font-semibold text-slate-400 pointer-events-none select-none">
          ₩
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="[0-9,]*"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={`w-full pl-8 pr-10 py-2.5 text-sm sm:text-base font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-300 ${className} ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'text-slate-800'
          }`}
        />
        <span className="absolute right-3.5 text-xs text-slate-400 pointer-events-none select-none">
          원
        </span>
      </div>

      {showQuickButtons && !disabled && (
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => handleAddAmount(10000)}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer shrink-0 text-slate-600"
          >
            +1만
          </button>
          <button
            type="button"
            onClick={() => handleAddAmount(50000)}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer shrink-0 text-slate-600"
          >
            +5만
          </button>
          <button
            type="button"
            onClick={() => handleAddAmount(100000)}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer shrink-0 text-slate-600"
          >
            +10만
          </button>
          <button
            type="button"
            onClick={() => onChange(0)}
            className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0 text-slate-500"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
};
