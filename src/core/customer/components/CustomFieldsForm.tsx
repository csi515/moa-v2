import React from 'react';
import type { CustomFieldDefinition } from '../customFields';

export interface CustomFieldsFormProps {
  fields: readonly CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/**
 * 업종별 커스텀 필드 선언형 동적 렌더러.
 * 스키마 정의에 따라 text, number, select, boolean, textarea 등을 유연하게 렌더링합니다.
 */
export const CustomFieldsForm: React.FC<CustomFieldsFormProps> = ({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  if (!fields || fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = values[field.key] ?? field.defaultValue ?? '';
        const error = errors[field.key];

        return (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {field.label}
              {field.required && <span className="text-rose-500 ml-1">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={value}
                placeholder={field.placeholder}
                disabled={disabled}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50"
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={value}
                placeholder={field.placeholder}
                disabled={disabled}
                onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50"
              />
            )}

            {field.type === 'select' && (
              <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50"
              >
                <option value="">선택해주세요</option>
                {field.options?.map((opt) => {
                  const optVal = typeof opt === 'string' ? opt : opt.value;
                  const optLabel = typeof opt === 'string' ? opt : opt.label;
                  return (
                    <option key={optVal} value={optVal}>
                      {optLabel}
                    </option>
                  );
                })}
              </select>
            )}

            {field.type === 'boolean' && (
              <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={disabled}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-600">{field.description || field.label}</span>
              </label>
            )}

            {field.type === 'textarea' && (
              <textarea
                value={value}
                placeholder={field.placeholder}
                disabled={disabled}
                rows={3}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50 resize-none"
              />
            )}

            {field.description && field.type !== 'boolean' && (
              <p className="text-[11px] text-slate-500">{field.description}</p>
            )}

            {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
          </div>
        );
      })}
    </div>
  );
};
