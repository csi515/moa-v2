/**
 * Moa-v2 Dynamic Schema Form Renderer (<AutoSchemaForm />).
 *
 * CapabilitySetupSchema로부터 입력 UI, Zod 유효성 검사, 저장 뮤테이션을
 * 런타임에 선언적으로 자동 생성하는 범용 폼 컴포넌트.
 *
 * 지원 기능:
 * 1. 7대 필드 타입 자동 렌더링 (text, number, boolean, select, time, tags, textarea)
 * 2. Zod 스키마 런타임 빌드 & 실시간 인라인 오류 메시지 표출
 * 3. Refine v5 useForm 리소스 모드 및 독립 onSubmit 콜백 모드 동시 지원
 * 4. 사장님 친화적 UI: 필수 항목 표시, 힌트 설명, 태그 칩 에디터, 토글 스위치 내장
 */

import React, { useMemo, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Loader2, X, Plus, CheckCircle2 } from 'lucide-react';
import type { CapabilitySetupSchema, SetupFieldDefinition } from '@/core/presets/types';
import { FormField, FORM_CONTROL_CLASS, FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui/FormField';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import {
  buildZodSchemaFromSetupSchema,
  extractDefaultValuesFromSetupSchema,
} from './schemaFormBuilder';

export interface AutoSchemaFormProps {
  /** 렌더링할 선언적 스키마 객체 */
  schema: CapabilitySetupSchema;
  /** 기존 데이터 또는 수정할 초기값 */
  initialValues?: Record<string, unknown>;
  /** 저장 제출 핸들러 (독립 모드) */
  onSubmit?: (values: Record<string, unknown>) => Promise<void> | void;
  /** 저장 성공 시 콜백 */
  onSuccess?: (values: Record<string, unknown>) => void;
  /** 취소 버튼 클릭 시 콜백 */
  onCancel?: () => void;
  /** 저장 버튼 라벨 (기본값: '저장하기') */
  submitLabel?: string;
  /** 취소 버튼 라벨 (기본값: '취소') */
  cancelLabel?: string;
  /** 폼 전체 비활성화 여부 */
  disabled?: boolean;
  /** 상단 스키마 제목 및 설명 노출 여부 (기본값: true) */
  showTitleHeader?: boolean;
  /** 커스텀 클래스 */
  className?: string;
}

export const AutoSchemaForm: React.FC<AutoSchemaFormProps> = ({
  schema,
  initialValues,
  onSubmit,
  onSuccess,
  onCancel,
  submitLabel = '저장하기',
  cancelLabel = '취소',
  disabled = false,
  showTitleHeader = true,
  className = '',
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // 1. Zod 스키마 및 기본값 메모이제이션
  const zodSchema = useMemo(() => buildZodSchemaFromSetupSchema(schema), [schema]);
  const defaultValues = useMemo(
    () => extractDefaultValuesFromSetupSchema(schema, initialValues),
    [schema, initialValues]
  );

  // 2. React Hook Form 초기화
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Record<string, any>>({
    defaultValues,
    resolver: zodResolver(zodSchema),
  });

  // 3. 폼 제출 핸들러
  const handleFormSubmit: SubmitHandler<Record<string, any>> = async (data) => {
    setGeneralError(null);
    setSaveSuccess(false);

    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setSaveSuccess(true);
      if (onSuccess) {
        onSuccess(data);
      }
      // 3초 후 성공 뱃지 자동 소거
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err?.message || '저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  // 4. 필드별 동적 렌더러
  const renderField = (field: SetupFieldDefinition) => {
    const errorMsg = errors[field.id]?.message as string | undefined;
    const hasError = Boolean(errorMsg);
    const inputClass = `${FORM_CONTROL_CLASS} ${hasError ? FORM_CONTROL_ERROR_CLASS : ''}`;

    switch (field.type) {
      case 'boolean': {
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="pr-4">
                  <span className="block text-xs font-semibold text-slate-800">
                    {field.label}
                    {field.required && <span className="text-rose-500"> *</span>}
                  </span>
                  {field.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{field.description}</p>
                  )}
                  {hasError && <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>}
                </div>
                <ToggleSwitch
                  enabled={Boolean(value)}
                  onChange={onChange}
                  ariaLabel={field.label}
                  disabled={disabled || isSubmitting}
                />
              </div>
            )}
          />
        );
      }

      case 'select': {
        return (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            required={field.required}
            error={errorMsg}
            hint={field.description}
          >
            <select
              id={field.id}
              {...register(field.id)}
              disabled={disabled || isSubmitting}
              className={inputClass}
            >
              {field.options?.map((opt) => (
                <option key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
        );
      }

      case 'textarea': {
        return (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            required={field.required}
            error={errorMsg}
            hint={field.description}
          >
            <textarea
              id={field.id}
              rows={3}
              placeholder={field.placeholder}
              {...register(field.id)}
              disabled={disabled || isSubmitting}
              className={inputClass}
            />
          </FormField>
        );
      }

      case 'number': {
        return (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            required={field.required}
            error={errorMsg}
            hint={field.description}
          >
            <input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              {...register(field.id, { valueAsNumber: true })}
              disabled={disabled || isSubmitting}
              className={inputClass}
            />
          </FormField>
        );
      }

      case 'time': {
        return (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            required={field.required}
            error={errorMsg}
            hint={field.description}
          >
            <input
              id={field.id}
              type="time"
              {...register(field.id)}
              disabled={disabled || isSubmitting}
              className={inputClass}
            />
          </FormField>
        );
      }

      case 'tags': {
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            render={({ field: { value = [], onChange } }) => (
              <TagEditorField
                field={field}
                tags={Array.isArray(value) ? value : []}
                onChange={onChange}
                error={errorMsg}
                disabled={disabled || isSubmitting}
              />
            )}
          />
        );
      }

      case 'text':
      default: {
        return (
          <FormField
            key={field.id}
            label={field.label}
            htmlFor={field.id}
            required={field.required}
            error={errorMsg}
            hint={field.description}
          >
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              {...register(field.id)}
              disabled={disabled || isSubmitting}
              className={inputClass}
            />
          </FormField>
        );
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={`space-y-4 ${className}`}>
      {/* 폼 상단 헤더 */}
      {showTitleHeader && (
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{schema.title}</h3>
          {schema.description && (
            <p className="text-xs text-slate-500 mt-0.5">{schema.description}</p>
          )}
        </div>
      )}

      {/* 전역 에러 알림 */}
      {generalError && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {generalError}
        </div>
      )}

      {/* 저장 완료 알림 */}
      {saveSuccess && (
        <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>설정이 안전하게 저장되었습니다.</span>
        </div>
      )}

      {/* 필드 목록 렌더링 */}
      <div className="space-y-3.5">
        {schema.fields.map((field) => renderField(field))}
      </div>

      {/* 하단 버튼 액션 바 */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled || isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>저장 중...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

/**
 * 태그(배열) 전용 서브 에디터 컴포넌트
 */
const TagEditorField: React.FC<{
  field: SetupFieldDefinition;
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, tags, onChange, error, disabled = false }) => {
  const [newTagInput, setNewTagInput] = useState('');

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <FormField
      label={field.label}
      htmlFor={field.id}
      required={field.required}
      error={error}
      hint={field.description}
    >
      <div className="space-y-2">
        {/* 태그 칩 목록 */}
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {tags.length === 0 ? (
            <span className="text-xs text-slate-400 py-1">등록된 태그가 없습니다.</span>
          ) : (
            tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-700 rounded-lg border border-slate-200"
              >
                <span>{tag}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-slate-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        {/* 새 태그 입력 */}
        {!disabled && (
          <div className="flex items-center gap-1.5">
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder || '태그 입력 후 Enter'}
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className={FORM_CONTROL_CLASS}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </FormField>
  );
};
