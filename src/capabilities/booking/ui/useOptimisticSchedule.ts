import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';

export interface OptimisticMoveResult {
  ok: boolean;
  message?: string;
}

/**
 * 캘린더 드래그 앤 드롭 및 리사이즈를 위한 낙관적 UI 업데이트 및 롤백 훅
 *
 * 1. 드롭 즉시 화면을 갱신 (Optimistic UI)
 * 2. 백엔드 검증/저장 비동기 수행
 * 3. 자원 충돌, 유효성 실패 또는 네트워크 에러 시 원래 상태로 안전 롤백
 */
export function useOptimisticSchedule<T extends { id: string }>(initialItems: T[]) {
  const [optimisticItems, setOptimisticItems] = useState<T[]>(initialItems);
  const snapshotRef = useRef<T[]>(initialItems);

  useEffect(() => {
    setOptimisticItems(initialItems);
    snapshotRef.current = initialItems;
  }, [initialItems]);

  const executeMove = useCallback(
    async (
      itemId: string,
      optimisticPatch: Partial<T>,
      persistFn: () => Promise<OptimisticMoveResult>
    ): Promise<boolean> => {
      // 1. 이전 스냅샷 백업
      const previousSnapshot = snapshotRef.current;

      // 2. 낙관적 업데이트 즉각 반영
      setOptimisticItems((current) =>
        current.map((item) =>
          item.id === itemId ? ({ ...item, ...optimisticPatch } as T) : item
        )
      );

      try {
        // 3. 도메인 저장/검증 수행
        const result = await persistFn();
        if (!result.ok) {
          // 실패 시 원래 스냅샷으로 롤백
          setOptimisticItems(previousSnapshot);
          if (result.message) {
            showToast(result.message, 'warning');
          }
          return false;
        }

        // 성공 토스트
        showToast('일정이 변경되었습니다.', 'success');
        return true;
      } catch (err) {
        // 예외 발생 시 롤백
        setOptimisticItems(previousSnapshot);
        const msg = err instanceof Error ? err.message : '일정 변경 중 오류가 발생했습니다.';
        showToast(msg, 'error');
        return false;
      }
    },
    []
  );

  const revert = useCallback(() => {
    setOptimisticItems(snapshotRef.current);
  }, []);

  return {
    optimisticItems,
    setOptimisticItems,
    executeMove,
    revert,
  };
}
