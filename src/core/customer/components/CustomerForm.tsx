import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useTerminology } from '@/core/terminology';
import { Button, FORM_ACTION_BUTTON_CLASS, FormField } from '@/shared/components/ui';
import { formatPhoneNumber } from '@/shared/components/ui/SmartInput';
import { UI_RADIUS, UI_SIZES } from '@/shared/styles/density';

/** 모바일 16px·44px. iOS 입력 확대와 터치 타깃 규격. */
const FIELD_CLASS = `w-full ${UI_SIZES.md.height} px-3.5 text-base bg-slate-50 border border-slate-200 ${UI_RADIUS.control} focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-300`;

export type CustomerFormMode = 'create' | 'edit';

export type CustomerFormValues = {
  name: string;
  phone: string;
  memo: string;
  tags: string[];
};

type Props = {
  mode: CustomerFormMode;
  initialValues?: Partial<CustomerFormValues>;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  idPrefix?: string;
};

const EMPTY: CustomerFormValues = { name: '', phone: '', memo: '', tags: [] };

export function readCustomerTags(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const tags = (metadata as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function toCustomerFormValues(row: {
  name: string;
  phone?: string | null;
  memo?: string | null;
  metadata?: unknown;
}): CustomerFormValues {
  return {
    name: row.name ?? '',
    phone: formatPhoneNumber(row.phone ?? ''),
    memo: row.memo ?? '',
    tags: readCustomerTags(row.metadata),
  };
}

/** 저장 payload. 전화번호는 숫자만 남겨 기존 고객 키와 맞춘다. */
export function toCustomerWriteValues(
  values: CustomerFormValues,
  metadata?: unknown
): { name: string; phone: string | null; memo: string | null; metadata: Record<string, unknown> } {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const digits = values.phone.replace(/\D/g, '');
  return {
    name: values.name.trim(),
    phone: digits.length > 0 ? digits : null,
    memo: values.memo.trim() || null,
    metadata: { ...base, tags: values.tags },
  };
}

/**
 * 업종 중립 고객 입력 폼. 생성·수정 모두 같은 필드를 쓴다.
 * 저장은 호출부가 Refine useCreate / useUpdate 로 처리한다.
 */
export function CustomerForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  idPrefix = 'customer-form',
}: Props) {
  const { t } = useTerminology();
  const customerWord = t('customer.singular', '고객');
  const [values, setValues] = useState<CustomerFormValues>({
    ...EMPTY,
    ...initialValues,
    phone: formatPhoneNumber(initialValues?.phone ?? ''),
    tags: initialValues?.tags ?? [],
  });
  const [tagDraft, setTagDraft] = useState('');
  const [nameError, setNameError] = useState('');

  const addTag = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    setValues((prev) =>
      prev.tags.includes(next) ? prev : { ...prev, tags: [...prev.tags, next] }
    );
    setTagDraft('');
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagDraft);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const name = values.name.trim();
    if (!name) {
      setNameError(`${customerWord} 이름을 입력해 주세요.`);
      const field = document.getElementById(`${idPrefix}-name`);
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setNameError('');
    const pendingTag = tagDraft.trim();
    const tags = pendingTag && !values.tags.includes(pendingTag)
      ? [...values.tags, pendingTag]
      : values.tags;
    void onSubmit({ ...values, name, tags });
  };

  const resolvedSubmit =
    submitLabel ?? (mode === 'create' ? `${customerWord} 등록` : '저장');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label={`${customerWord} 이름`} htmlFor={`${idPrefix}-name`} required error={nameError}>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={values.name}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, name: event.target.value }));
            if (nameError) setNameError('');
          }}
          className={FIELD_CLASS}
          placeholder="예: 홍길동"
          autoComplete="name"
          aria-invalid={Boolean(nameError)}
        />
      </FormField>

      <FormField label="연락처" htmlFor={`${idPrefix}-phone`} hint="숫자만 입력하면 자동으로 나뉩니다.">
        <input
          id={`${idPrefix}-phone`}
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, phone: formatPhoneNumber(event.target.value) }))
          }
          className={FIELD_CLASS}
          placeholder="010-0000-0000"
        />
      </FormField>

      <FormField label="메모" htmlFor={`${idPrefix}-memo`}>
        <textarea
          id={`${idPrefix}-memo`}
          value={values.memo}
          onChange={(event) => setValues((prev) => ({ ...prev, memo: event.target.value }))}
          className={`${FIELD_CLASS} min-h-[88px] h-auto py-3 resize-y`}
          placeholder="방문 성향, 요청 사항"
        />
      </FormField>

      <FormField label="특이사항 태그" htmlFor={`${idPrefix}-tag`} hint="입력 후 Enter. 예: 단골, 알러지">
        <input
          id={`${idPrefix}-tag`}
          type="text"
          value={tagDraft}
          onChange={(event) => setTagDraft(event.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={() => addTag(tagDraft)}
          className={FIELD_CLASS}
          placeholder="태그 추가"
        />
        {values.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {values.tags.map((tag) => (
              <li key={tag}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setValues((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))
                  }
                  rightIcon={<X className="w-3 h-3" aria-hidden />}
                  aria-label={`${tag} 제거`}
                >
                  {tag}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </FormField>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="default"
            className={FORM_ACTION_BUTTON_CLASS}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="default"
          className={FORM_ACTION_BUTTON_CLASS}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {resolvedSubmit}
        </Button>
      </div>
    </form>
  );
}
