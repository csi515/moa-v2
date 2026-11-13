import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * useDebounce
 * 값이 변경될 때 지정된 지연 시간(delayMs) 후에 디바운스된 값을 반환합니다.
 * 검색어 입력 등 빈번한 상태 변경 시 불필요한 재계산/API 호출을 방지합니다.
 *
 * @param value 관찰할 원본 값
 * @param delayMs 디바운스 지연 시간 (밀리초, 기본값 300ms)
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useDebounceCallback
 * 함수를 디바운스하여 마지막 호출 후 delayMs가 경과했을 때 1회만 실행하도록 감쌉니다.
 */
export function useDebounceCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = 300
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );
}
