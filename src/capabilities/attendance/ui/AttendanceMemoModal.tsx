import React from 'react';
import { Modal } from '@/shared/components';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { usePermissions } from '@/core/auth/usePermissions';
import type { Student } from '@/types';
import type { AttendanceSession } from '../domain/types';

/** 출석(세션) 메모 편집 — 어린이집은 하원·전달 카피 유지 */
export function AttendanceMemoModal({
  open,
  student,
  session,
  draft,
  onDraftChange,
  onClose,
  onSave,
  saveButtonClassName,
}: {
  open: boolean;
  student: Student | null;
  session?: AttendanceSession;
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveButtonClassName: string;
}) {
  const { industry } = usePermissions();
  const daycareStyle = industry === 'daycare';
  const titleSuffix = daycareStyle ? '하원·전달 메모' : '출석 메모';
  const hint = daycareStyle
    ? '세션 메모 · 등원 후 전달 사항 기록'
    : '세션 메모 · 출석 관련 전달 사항';
  const placeholder = daycareStyle
    ? '예: 조부모님 하원, 16:30 픽업 예정'
    : '예: 조부모님이 데리러 오심, 16:30 예정';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`${student?.name || ''} ${titleSuffix}`}
      maxWidth="md"
    >
      <div className="p-5 space-y-4">
        {student?.specialNotes && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            주의 · {student.specialNotes}
          </p>
        )}
        {session?.checkInAt && (
          <p className="text-[11px] text-slate-400 font-mono">{hint}</p>
        )}
        <textarea
          rows={4}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={placeholder}
          className={`${FORM_CONTROL_CLASS} resize-none`}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`px-4 py-2.5 min-h-[44px] text-sm font-bold text-white rounded-xl ${saveButtonClassName}`}
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  );
}
