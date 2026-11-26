import React, { type FormEvent, type ReactNode } from 'react';
import { Modal, type ModalIntent } from './Modal';
import { Button } from './Button';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  /** 좌측 보조 액션 (예: 삭제 버튼) */
  footerExtra?: ReactNode;
  dirty?: boolean;
  confirmClose?: (proceed: () => void) => void;
  intent?: ModalIntent;
}

/**
 * Moa-v2 표준 폼 모달 컴포넌트 (FormModal)
 * - 공통 `Modal`을 상속하여 완벽한 포커스 트랩(A11y), Escape 키 차단, 미저장 폼 보호(dirty) 내장
 * - 상단 헤더, 스크롤 가능한 본문, 하단 고정 액션바(취소 + 저장)의 레이아웃을 단일화
 */
export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = '저장',
  cancelLabel = '취소',
  isSubmitting = false,
  submitDisabled = false,
  maxWidth = 'md',
  footerExtra,
  dirty = false,
  confirmClose,
  intent = 'form',
}) => {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submitDisabled) return;
    onSubmit?.(e);
  };

  const footer = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2">
        {footerExtra}
      </div>
      <div className="flex items-center gap-2.5 ml-auto">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={submitDisabled || isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth={maxWidth}
      intent={intent}
      dirty={dirty}
      confirmClose={confirmClose}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </Modal>
  );
};
