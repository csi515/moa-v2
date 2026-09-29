import React, { useState } from 'react';
import { KeyRound, ChevronRight } from 'lucide-react';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS_LABELS,
  type GlobalStudent,
  type StudentEnrollment,
} from '@/core/parent/types/globalParent';
import { PIN_ATTENDANCE_PARENT_COPY } from '@/core/attendance/attendanceNotifyCopy';
import { ParentEnrollmentPinEditor } from './ParentEnrollmentPinEditor';

interface ParentChildPinSectionProps {
  children: GlobalStudent[];
  onRefresh: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** 자녀별·학원별 출입 PIN 관리 */
export const ParentChildPinSection: React.FC<ParentChildPinSectionProps> = ({
  children,
  onRefresh,
  showToast,
}) => {
  const [editing, setEditing] = useState<{
    child: GlobalStudent;
    enrollment: StudentEnrollment;
  } | null>(null);

  const editableEnrollments = children.flatMap((child) =>
    child.enrollments
      .filter((e) => ACTIVE_ENROLLMENT_STATUSES.includes(e.status))
      .map((enrollment) => ({ child, enrollment }))
  );

  if (editableEnrollments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">출입 PIN</p>
        </div>
        <p className="text-xs text-slate-500 -mt-1 leading-relaxed">
          {PIN_ATTENDANCE_PARENT_COPY.childPinHint}
        </p>

        {children.map((child) => {
          const rows = child.enrollments.filter((e) =>
            ACTIVE_ENROLLMENT_STATUSES.includes(e.status)
          );
          if (rows.length === 0) return null;

          return (
            <div key={child.studentId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <p className="font-bold text-slate-900">{child.displayName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rows.filter((e) => e.checkInPinSet).length}/{rows.length}개 학원 PIN 설정됨
                </p>
              </div>
              <ul>
                {rows.map((enrollment) => (
                  <li key={enrollment.enrollmentId}>
                    <button
                      type="button"
                      onClick={() => setEditing({ child, enrollment })}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50/50 min-h-[44px]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {enrollment.organizationName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                            enrollment.checkInPinSet
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {enrollment.checkInPinSet ? '설정됨' : '미설정'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {editing && (() => {
        const fresh = children
          .find((c) => c.studentId === editing.child.studentId)
          ?.enrollments.find((e) => e.enrollmentId === editing.enrollment.enrollmentId);
        if (!fresh) return null;
        const child =
          children.find((c) => c.studentId === editing.child.studentId) ?? editing.child;
        return (
          <ParentEnrollmentPinEditor
            childName={child.displayName}
            enrollment={fresh}
            onClose={() => setEditing(null)}
            showToast={showToast}
            onUpdated={onRefresh}
          />
        );
      })()}
    </>
  );
};
