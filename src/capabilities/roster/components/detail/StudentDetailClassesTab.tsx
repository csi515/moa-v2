import React from 'react';
import { ClassItem } from '@/types';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useModuleLabels } from '@/core/labels';

interface StudentDetailClassesTabProps {
  enrolledClasses: ClassItem[];
}

export const StudentDetailClassesTab: React.FC<StudentDetailClassesTabProps> = ({ enrolledClasses }) => {
  const { setActiveTab } = useApp();
  const labels = useModuleLabels();
  const serviceLabel = labels.service.singular;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900">정규 수업 일정</h4>
        <button
          type="button"
          onClick={() => setActiveTab('makeups')}
          className="text-xs font-bold text-indigo-600 min-h-[44px] px-1"
        >
          보강 관리
        </button>
      </div>
      {enrolledClasses.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 rounded-2xl space-y-2">
          <p className="text-xs text-slate-500">
            배정된 {serviceLabel}이(가) 없습니다. 학생 정보에서 {serviceLabel}을(를) 선택하세요.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className="text-xs font-bold text-indigo-600 min-h-[44px]"
          >
            {serviceLabel} 관리로 이동
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enrolledClasses.map((cls) => (
            <div key={cls.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-sm text-slate-900">{cls.name}</h5>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {cls.room}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                요일: <strong>{(cls.daysOfWeek || []).join(', ')}</strong> · {cls.startTime}–{cls.endTime}
              </p>
              <p className="text-xs text-slate-500">
                선생님: {cls.teacherName} · 교재: {cls.textbook || '-'}
              </p>
              {cls.memo && <p className="text-[11px] text-slate-400 bg-white p-2 rounded-lg">{cls.memo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
