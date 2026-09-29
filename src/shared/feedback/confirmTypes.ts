/** 확인 다이얼로그 옵션. AppContext adapter와 분리된 타입 계약. */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 세 번째 동작. 강제 로그아웃 등 */
  altText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onAlt?: () => void;
}
