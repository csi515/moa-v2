import { useState } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { getPrimaryGuardian } from '@/core/parent';

export type StudentConsultationType =
  | 'trial'
  | 'regular'
  | 'exam'
  | 'learning'
  | 'entrance'
  | 'complaint'
  | 'other'
  | string;

export interface UseStudentConsultationParams {
  student: {
    id: string;
    name: string;
    parentName?: string;
  };
  currentUser: { name: string };
  contactSingularLabel: string;
  counselorId?: string;
  onSaveConsultation?: (data: {
    studentId: string;
    studentName: string;
    parentName: string;
    date: string;
    type: any;
    content: string;
    result: string;
    nextDate?: string;
    counselorId: string;
    counselorName: string;
  }) => void;
}

export function useStudentConsultation({
  student,
  currentUser,
  contactSingularLabel,
  counselorId = '',
  onSaveConsultation,
}: UseStudentConsultationParams) {
  const [isAddCstOpen, setIsAddCstOpen] = useState(false);
  const [newCstType, setNewCstType] = useState<StudentConsultationType>('learning');
  const [newCstContent, setNewCstContent] = useState('');
  const [newCstResult, setNewCstResult] = useState('');
  const [newCstNextDate, setNewCstNextDate] = useState('');

  const handleSaveConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCstContent.trim()) {
      showToast('상담 내용을 입력해주세요.', 'warning');
      return;
    }
    if (!onSaveConsultation) {
      showToast('상담 저장 함수가 설정되지 않았습니다.', 'error');
      return;
    }
    onSaveConsultation({
      studentId: student.id,
      studentName: student.name,
      parentName:
        getPrimaryGuardian(student.id)?.parentName ||
        student.parentName ||
        contactSingularLabel,
      date: todayIsoLocal(),
      type: newCstType,
      content: newCstContent.trim(),
      result: newCstResult.trim(),
      nextDate: newCstNextDate || undefined,
      counselorId,
      counselorName: currentUser.name,
    });
    showToast('상담 기록이 저장되었습니다.', 'success');
    setIsAddCstOpen(false);
    setNewCstContent('');
    setNewCstResult('');
    setNewCstNextDate('');
  };

  return {
    isAddCstOpen,
    setIsAddCstOpen,
    newCstType,
    setNewCstType,
    newCstContent,
    setNewCstContent,
    newCstResult,
    setNewCstResult,
    newCstNextDate,
    setNewCstNextDate,
    onSave: handleSaveConsultation,
  };
}
