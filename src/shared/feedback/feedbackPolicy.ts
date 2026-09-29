/**
 * UX feedback 역할.
 * Toast = 짧게 알려주면 되는 성공/정보/경고
 * Inline = 현재 화면에서 사용자가 고칠 오류 (FormField.error)
 * Status = 결제/예약/등록처럼 화면에 남겨야 하는 결과
 */
export type FeedbackChannel = 'toast' | 'inline' | 'status';

export type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

export interface WorkStatusMessage {
  id: string;
  title: string;
  message: string;
  tone: FeedbackTone;
}

export const MAX_VISIBLE_TOASTS = 2;

export function nextWorkStatusId(): string {
  return `status-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
