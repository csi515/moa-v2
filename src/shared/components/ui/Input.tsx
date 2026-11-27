import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  hasError?: boolean;
  onClear?: () => void;
  inputSize?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'min-h-[36px] h-9 text-xs px-3',
  md: 'min-h-[44px] h-11 text-sm px-3.5',
  lg: 'min-h-[48px] h-12 text-sm sm:text-base px-4',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      leftIcon,
      rightIcon,
      hasError = false,
      onClear,
      inputSize = 'md',
      className = '',
      value,
      disabled,
      ...rest
    },
    ref
  ) => {
    const showClear = Boolean(onClear && value && !disabled);

    return (
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          value={value}
          disabled={disabled}
          className={`w-full bg-slate-50 border rounded-xl placeholder:text-slate-400 text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-100 disabled:pointer-events-none ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon || showClear ? 'pr-10' : ''} ${
            hasError
              ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-500 focus:border-rose-400'
              : 'border-slate-200 focus:ring-slate-900 focus:border-transparent'
          } ${SIZE_CLASSES[inputSize]} ${className}`}
          {...rest}
        />

        {showClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="입력 내용 지우기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : rightIcon ? (
          <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
