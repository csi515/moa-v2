import { useState, useCallback, useRef } from 'react';
import { showToast } from './uiFeedback';

export interface UndoActionPayload<T = unknown> {
  message: string;
  previousState: T;
  onUndo: (previousState: T) => void | Promise<void>;
  durationMs?: number;
}

export function useUndoAction() {
  const [activeUndo, setActiveUndo] = useState<{
    id: string;
    message: string;
    undo: () => void;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerWithUndo = useCallback(
    <T,>(payload: UndoActionPayload<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = String(Date.now());
      const duration = payload.durationMs ?? 6000;

      const undo = async () => {
        try {
          await payload.onUndo(payload.previousState);
          showToast('작업이 실행 취소되었습니다.', 'info');
        } catch (e) {
          showToast('실행 취소 중 오류가 발생했습니다.', 'error');
        } finally {
          setActiveUndo(null);
        }
      };

      setActiveUndo({
        id,
        message: payload.message,
        undo,
      });

      // Duration 후 자동 해제
      timerRef.current = setTimeout(() => {
        setActiveUndo((current) => (current?.id === id ? null : current));
      }, duration);
    },
    []
  );

  const dismissUndo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveUndo(null);
  }, []);

  return {
    activeUndo,
    triggerWithUndo,
    dismissUndo,
  };
}
