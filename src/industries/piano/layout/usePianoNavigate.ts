import { useCallback } from 'react';
import { useApp, type NavTab } from '@/context/AppContext';
import { resolvePianoCanonicalTab } from '../config/canonicalTabs';

/**
 * 피아노 사이드바·하단·화면 내 이동의 단일 진입점.
 * 별칭(Alias) 탭 진입 시 캐노니컬 식별자로 정규화하며, 학생 탭 진입 시 상세 선택만 초기화합니다.
 */
export function usePianoNavigate() {
  const { setActiveTab, setSelectedStudentId } = useApp();

  return useCallback(
    (tab: NavTab) => {
      const canonicalTab = (resolvePianoCanonicalTab(tab) as NavTab) || tab;
      if (canonicalTab === 'students') setSelectedStudentId(null);
      setActiveTab(canonicalTab);
    },
    [setActiveTab, setSelectedStudentId]
  );
}
