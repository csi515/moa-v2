import React, { useEffect } from 'react';
import type { Path, DefaultValues } from 'react-hook-form';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useMoaForm } from '@/shared/hooks/data/useMoaForm';
import type { AutoEntityModalProps } from './types';

/**
 * Moa-v2 선언형 표준 엔티티 등록/수정 모달 (<AutoEntityModal />)
 *
 * 특징:
 * 1. @/shared/components/ui/Modal 정식 상속 (인라인 모달 금지 헌법 준수)
 * 2. useMoaForm 기반 테넌트 격리 및 멱등 CUD 자동 바인딩
 * 3. 이중 제출 방지 락(Double-Submit Lock), 모바일 44px 터치 타깃 준수
 * 4. 한국어 정규화 에러/성공 토스트 자동 처리
 */
export function AutoEntityModal<TFormData extends Record<string, any> = Record<string, any>>({
  isOpen,
  onClose,
  title,
  entityName = '항목',
  resource,
  fields,
  recordId,
  initialValues,
  onSuccess,
  successMessage,
}: AutoEntityModalProps<TFormData>) {
  const isEdit = Boolean(recordId);
  const modalTitle = title || (isEdit ? `${entityName} 수정` : `새 ${entityName} 등록`);

  // 1. Moa-v2 일원화 폼 훅 바인딩
  const {
    register,
    onSubmit,
    reset,
    formState: { errors },
    isSubmitting,
  } = useMoaForm<TFormData>({
    resource,
    recordId,
    entityName,
    defaultValues: initialValues as DefaultValues<TFormData>,
    onSuccess: (saved) => {
      onSuccess?.(saved);
      onClose();
    },
    customSuccessMsg: successMessage,
  });

  // 모달이 열릴 때 초기값 리셋
  useEffect(() => {
    if (isOpen) {
      reset(initialValues as DefaultValues<TFormData>);
    }
  }, [isOpen, initialValues, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="md"
      intent="form"
      footer={
        <div className="flex items-center justify-end space-x-2.5 w-full">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px]"
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-h-[44px] min-w-[80px]"
          >
            {isSubmitting ? '저장 중...' : isEdit ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 py-1">
        {fields.map((field) => {
          const fieldPath = field.name as Path<TFormData>;
          const errorMsg = errors[field.name]?.message as string | undefined;

          return (
            <div key={field.name} className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <span>{field.label}</span>
                {field.required && <span className="text-rose-500">*</span>}
              </label>

              {/* 텍스트 / 숫자 / 날짜 인풋 */}
              {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={field.disabled || isSubmitting}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors min-h-[44px] ${
                    field.type === 'number' ? 'tabular-nums' : ''
                  } ${
                    errorMsg
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                  }`}
                  {...register(fieldPath, {
                    required: field.required ? `${field.label}은(는) 필수입니다` : false,
                    valueAsNumber: field.type === 'number',
                  })}
                />
              )}

              {/* 셀렉트 드롭다운 */}
              {field.type === 'select' && (
                <select
                  disabled={field.disabled || isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white min-h-[44px] focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  {...register(fieldPath, {
                    required: field.required ? `${field.label}을(를) 선택하세요` : false,
                  })}
                >
                  <option value="">선택하세요</option>
                  {field.options?.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* 텍스트 영역 */}
              {field.type === 'textarea' && (
                <textarea
                  rows={3}
                  placeholder={field.placeholder}
                  disabled={field.disabled || isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm resize-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  {...register(fieldPath, {
                    required: field.required ? `${field.label}은(는) 필수입니다` : false,
                  })}
                />
              )}

              {/* 스위치 / 체크박스 */}
              {field.type === 'switch' && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id={field.name}
                    disabled={field.disabled || isSubmitting}
                    className="w-4 h-4 rounded text-slate-800 focus:ring-slate-900 border-slate-300 cursor-pointer"
                    {...register(fieldPath)}
                  />
                  <label htmlFor={field.name} className="text-xs text-slate-600 cursor-pointer">
                    {field.helperText || '활성화'}
                  </label>
                </div>
              )}

              {/* 필드 헬퍼 텍스트 또는 에러 메시지 */}
              {errorMsg ? (
                <span className="text-xs text-rose-500 font-medium">{errorMsg}</span>
              ) : field.helperText && field.type !== 'switch' ? (
                <span className="text-xs text-slate-400">{field.helperText}</span>
              ) : null}
            </div>
          );
        })}
      </form>
    </Modal>
  );
}
