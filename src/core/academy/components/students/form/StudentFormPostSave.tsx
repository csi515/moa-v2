import React from 'react';
import type { Student } from '@/types';

interface Props {
  student: Student;
  isPiano: boolean;
  onOpenDetail: () => void;
  onPlaceTimetable: () => void;
  onOpenAttendance: () => void;
  onOpenTuition: () => void;
  onDismiss: () => void;
}

/** 등록 직후 다음 작업 안내 */
export const StudentFormPostSave: React.FC<Props> = ({
  student,
  isPiano,
  onOpenDetail,
  onPlaceTimetable,
  onOpenAttendance,
  onOpenTuition,
  onDismiss,
}) => (
  <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
    <div>
      <p className="text-sm font-bold text-emerald-900">{student.name} 등록 완료</p>
      <p className="text-[11px] text-emerald-800/80 mt-0.5">
        {isPiano
          ? '아직은 반·시간표에 배정되지 않았습니다. 상세를 보거나 시간표에서 직접 배치하세요.'
          : '다음 작업을 선택하세요.'}
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onOpenDetail}
        className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800"
      >
        상세 보기
      </button>
      {isPiano ? (
        <button
          type="button"
          onClick={onPlaceTimetable}
          className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-indigo-600 text-white border border-indigo-600"
        >
          시간표에 배치
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpenAttendance}
            className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800"
          >
            출결 기록
          </button>
          <button
            type="button"
            onClick={onOpenTuition}
            className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800"
          >
            수납 확인
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-[44px] px-3 rounded-xl text-xs font-bold text-slate-600"
      >
        닫기
      </button>
    </div>
  </div>
);
