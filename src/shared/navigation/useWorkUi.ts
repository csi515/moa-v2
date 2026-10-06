import { useApp } from '@/context/AppContext';

/**
 * Core UI가 사용하는 업무 화면 상태.
 * AppContext를 감싸는 래퍼입니다.
 */
export function useWorkUi() {
  return useApp();
}
