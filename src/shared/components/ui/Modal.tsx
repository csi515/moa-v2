import React, { ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { focusInitialElement, trapTabKey } from './modalFocus';

export type ModalIntent = 'view' | 'form';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  /** 제목 옆 추가 액션 (인쇄 등) */
  headerActions?: ReactNode;
  description?: string;
  /**
   * view: 조회(즉시 닫기). form: 입력/수정.
   * form + dirty이면 backdrop/X/Escape는 confirmClose를 거친다.
   */
  intent?: ModalIntent;
  dirty?: boolean;
  /** dirty form을 닫기 전 확인. proceed()를 호출하면 실제로 닫힌다. */
  confirmClose?: (proceed: () => void) => void;
  /** 스크롤 콘텐츠 밖에 고정되는 액션 영역 */
  footer?: ReactNode;
}

const MAX_WIDTH_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
} as const;

/** 중첩 Modal(ConfirmDialog)이 아래 Modal의 focus/Escape를 가로채지 않게 한다. */
let openModalLayer = 0;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  headerActions,
  description,
  intent = 'view',
  dirty = false,
  confirmClose,
  footer,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (intent === 'form' && dirty && confirmClose) {
      confirmClose(onClose);
      return;
    }
    onClose();
  }, [confirmClose, dirty, intent, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    openModalLayer += 1;
    const layer = openModalLayer;
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    const root = dialogRef.current;
    if (root) {
      focusInitialElement(root);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (layer !== openModalLayer) return;
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (root) trapTabKey(event, root);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModalLayer = Math.max(0, openModalLayer - 1);
      triggerRef.current?.focus?.();
    };
  }, [isOpen, requestClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={requestClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full ${MAX_WIDTH_CLASS[maxWidth]} max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 sm:duration-200`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shrink-0 gap-2">
          <div className="min-w-0">
            <h3 id={titleId} className="font-bold text-slate-900 text-base truncate">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="text-xs text-slate-500 truncate mt-0.5">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={requestClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
