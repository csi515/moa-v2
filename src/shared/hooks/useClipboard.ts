import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseClipboardOptions {
  /** 복사 성공 상태 유지 시간 (ms). 기본값: 2000 */
  timeout?: number;
  /** 복사 성공 시 콜백 */
  onSuccess?: (text: string) => void;
  /** 복사 실패 시 콜백 */
  onError?: (error: unknown) => void;
}

/**
 * useClipboard
 * 클립보드 텍스트 복사 및 피드백 상태를 안전하게 관리하는 표준 상용 훅.
 *
 * - 컴포넌트 언마운트 시 활성 타이머를 자동으로 클린업하여 메모리 누수를 방지합니다.
 * - navigator.clipboard 미지원/거부 환경에서 textarea 기반 안전한 폴백을 제공합니다.
 */
export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 컴포넌트 언마운트 시 타이머 클린업
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) return false;

      let success = false;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          success = true;
        } else if (typeof document !== 'undefined') {
          // Fallback for older browsers or non-secure contexts
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.pointerEvents = 'none';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (err) {
        success = false;
        onError?.(err);
      }

      if (success) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setCopied(true);
        onSuccess?.(text);

        timerRef.current = setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, timeout);
      }

      return success;
    },
    [timeout, onSuccess, onError]
  );

  return {
    copied,
    copy,
  };
}
