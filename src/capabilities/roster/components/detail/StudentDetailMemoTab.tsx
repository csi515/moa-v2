import React from 'react';
import { Student } from '@/types';
import { useModuleLabels } from '@/core/labels';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { combineStudentNotes } from '../form/studentFormTypes';

interface StudentDetailMemoTabProps {
  student: Student;
}

/** 활동 탭 — 특이사항 (기존 memo·specialNotes 호환 표시) */
export const StudentDetailMemoTab: React.FC<StudentDetailMemoTabProps> = ({ student }) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const notes = combineStudentNotes(student.specialNotes, student.memo);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        {customerLabel} 관련 알레르기·건강 주의사항·전달사항입니다.
      </p>

      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
        <h5 className="text-xs font-bold text-amber-900 uppercase">특이사항</h5>
        <p className="text-xs text-amber-950 whitespace-pre-line leading-relaxed">
          {notes || '등록된 특이사항이 없습니다.'}
        </p>
      </div>
    </div>
  );
};
