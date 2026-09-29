import React, { type ReactNode } from 'react';

interface Props {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
}

/** 설정/폼 필드. 사용자가 고칠 오류는 error(inline), 전역 실패는 toast. */
export const FormField: React.FC<Props> = ({
  label,
  htmlFor,
  required,
  children,
  className = '',
  error,
  hint,
}) => {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
};

export const FORM_CONTROL_CLASS =
  'w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300';

export const FORM_CONTROL_ERROR_CLASS =
  'border-rose-300 bg-rose-50 focus:ring-rose-500 focus:border-rose-400';
