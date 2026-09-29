import { useCallback } from 'react';
import { useApp, StudentDetailTab } from '@/context/AppContext';

/** 원생 상세 모달(특정 탭)로 이동하는 공통 hook */
export function useStudentNavigation() {
  const { setSelectedStudentId, setSelectedStudentDetailTab, setActiveTab } = useApp();

  const openStudent = useCallback(
    (studentId: string, tab?: StudentDetailTab) => {
      if (tab) setSelectedStudentDetailTab(tab);
      setSelectedStudentId(studentId);
      setActiveTab('students');
    },
    [setSelectedStudentId, setSelectedStudentDetailTab, setActiveTab]
  );

  return { openStudent };
}
