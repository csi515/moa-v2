import { useState, useCallback, useRef } from 'react';

export interface UseAsyncLockOptions {
  /** 락 해제 후 최소 대기 시간(ms, 쿨다운). 기본값: 0 */
  cooldownMs?: number;
}

/**
 * useAsyncLock
 * 비동기 작업(결제, 수납, 생성, 수정 등) 실행 중 사용자의 연속 광클(Double Submit)을
 * 원천 차단하는 상용 B2B 락 훅.
 *
 * - 첫 번째 비동기 함수 실행 중 들어오는 모든 중복 호출을 즉시 차단합니다.
 * - 에러 발생 시에도 안전하게 finally 블록에서 락이 해제됩니다.
 */
export function useAsyncLock(options: UseAsyncLockOptions = {}) {
  const { cooldownMs = 0 } = options;
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);

  const runWithLock = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | undefined> => {
      if (lockRef.current) {
        return undefined;
      }

      lockRef.current = true;
      setIsLocked(true);

      try {
        return await asyncFn();
      } finally {
        if (cooldownMs > 0) {
          setTimeout(() => {
            lockRef.current = false;
            setIsLocked(false);
          }, cooldownMs);
        } else {
          lockRef.current = false;
          setIsLocked(false);
        }
      }
    },
    [cooldownMs]
  );

  return {
    isLocked,
    runWithLock,
    withLock: runWithLock,
  };
}
