import { useState } from 'react';
import { useCreate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { todayIsoLocal } from '@/shared/utils/localDate';
import type { CustomerId } from '@/shared/kernel';

export interface UseStudentPracticeParams {
  student: {
    id: CustomerId;
    name: string;
  };
  practiceRecordsResource?: string;
  practiceRecordsSchema?: string;
}

export function useStudentPractice({
  student,
  practiceRecordsResource = 'practice_records',
  practiceRecordsSchema,
}: UseStudentPracticeParams) {
  const { currentOrganization } = useOrganization();
  const { mutate: createPracticeRecord } = useCreate();

  const [isAddPrOpen, setIsAddPrOpen] = useState(false);
  const [newPrDate, setNewPrDate] = useState(todayIsoLocal);
  const [newPrMinutes, setNewPrMinutes] = useState(40);
  const [newPrSong, setNewPrSong] = useState('');
  const [newPrDifficulty, setNewPrDifficulty] = useState('');
  const [newPrHomework, setNewPrHomework] = useState('');

  const handleSavePractice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrSong.trim()) {
      showToast('연습곡을 입력해주세요.', 'warning');
      return;
    }

    createPracticeRecord(
      {
        resource: practiceRecordsResource,
        ...(practiceRecordsSchema ? { meta: { schema: practiceRecordsSchema } } : {}),
        values: {
          organization_id: currentOrganization?.id,
          customer_id: student.id,
          practice_date: newPrDate,
          minutes: Number(newPrMinutes) || 30,
          song_title: newPrSong.trim(),
          homework: newPrHomework.trim() || null,
          difficulty_part: newPrDifficulty.trim() || null,
          teacher_evaluation: '⭐⭐⭐⭐',
          metadata: {
            source: 'staff',
            staffReviewed: true,
            studentName: student.name,
          },
        },
      },
      {
        onSuccess: () => {
          showToast('연습 기록이 저장되었습니다.', 'success');
          setIsAddPrOpen(false);
          setNewPrSong('');
          setNewPrDifficulty('');
          setNewPrHomework('');
        },
        onError: () => {
          showToast('연습 기록 저장에 실패했습니다.', 'error');
        },
      }
    );
  };

  return {
    isAddPrOpen,
    setIsAddPrOpen,
    newPrDate,
    setNewPrDate,
    newPrMinutes,
    setNewPrMinutes,
    newPrSong,
    setNewPrSong,
    newPrDifficulty,
    setNewPrDifficulty,
    onSave: handleSavePractice,
  };
}
