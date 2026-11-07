import React from 'react';
import { Calendar, CheckCircle2, CreditCard } from 'lucide-react';
import type { Student } from '@/types';
import { ROSTER_TIMETABLE_PLACE_BUTTON } from './rosterFormCopy';

interface Props {
  student: Student;
  /** 시간표 배치 버튼. 피아노 업종에서만 true. */
  showTimetablePlacement: boolean;
  hint: string;
  hasAutoInvoice?: boolean;
  onOpenDetail: () => void;
  onPlaceTimetable: () => void;
  onOpenAttendance: () => void;
  onOpenTuition: () => void;
  onPayNow?: () => void;
  onDismiss: () => void;
}

/** 등록 직후 다음 작업 안내 및 원스톱 수납/시간표 연동 */
export const StudentFormPostSave: React.FC<Props> = ({
  student,
  showTimetablePlacement,
  hint,
  hasAutoInvoice = false,
  onOpenDetail,
  onPlaceTimetable,
  onOpenAttendance,
  onOpenTuition,
  onPayNow,
  onDismiss,
}) => {
  const hasClassesAssigned = Array.isArray(student.classIds) && student.classIds.length > 0;

  return (
    <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
      <div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-900">{student.name} 등록 완료</p>
        </div>
        <div className="space-y-1 mt-1 text-[11px] text-emerald-800/80">
          <p>
            {hasClassesAssigned
              ? `수업 시간표(${student.classIds.length}개 반) 배정이 함께 완료되었습니다.`
              : hint}
          </p>
          {hasAutoInvoice && (
            <p className="font-semibold text-indigo-900 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              첫 달 수강료({Number(student.tuitionFee || 0).toLocaleString()}원) 청구서가 바로 발행되었습니다.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* 원클릭 첫 달 수강료 즉시 수납 버튼 */}
        {hasAutoInvoice && onPayNow && (
          <button
            type="button"
            onClick={onPayNow}
            className="min-h-[44px] px-4 rounded-xl text-xs font-black flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer ring-2 ring-indigo-400/40"
          >
            <CreditCard className="w-4 h-4" />
            <span>첫 달 수강료 지금 수납하기</span>
          </button>
        )}

        {showTimetablePlacement && (
          <button
            type="button"
            onClick={onPlaceTimetable}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
              hasClassesAssigned || hasAutoInvoice
                ? 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                : 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {hasClassesAssigned ? '시간표 확인하기' : ROSTER_TIMETABLE_PLACE_BUTTON}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenDetail}
          className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          원생 상세 보기
        </button>

        <button
          type="button"
          onClick={onOpenAttendance}
          className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          출결 화면
        </button>

        <button
          type="button"
          onClick={onOpenTuition}
          className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          수납 관리
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[44px] px-3.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
