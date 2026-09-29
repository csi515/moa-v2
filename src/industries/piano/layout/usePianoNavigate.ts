import { useCallback } from 'react';
import { useApp, type NavTab } from '@/context/AppContext';

/**
 * 피아노 사이드바·하단·화면 내 이동의 단일 진입점.
 * 학생 탭 진입 시 상세 선택만 초기화 (탭 문자열·딥링크는 변경하지 않음).
 */
export function usePianoNavigate() {
  const { setActiveTab, setSelectedStudentId } = useApp();

  return useCallback(
    (tab: NavTab) => {
      if (tab === 'students') setSelectedStudentId(null);
      setActiveTab(tab);
    },
    [setActiveTab, setSelectedStudentId]
  );
}
