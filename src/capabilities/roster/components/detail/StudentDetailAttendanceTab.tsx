import React from 'react';
import { AttendanceRecord, ClassItem } from '@/types';
import { getAttendanceBadge } from '@/utils/formatters';
import { Plus } from 'lucide-react';

interface StudentDetailAttendanceTabProps {
  allAttendance: AttendanceRecord[];
  totalAttCount: number;
  presentCount: number;
  attRate: number;
  isAddAttOpen: boolean;
  setIsAddAttOpen: (open: boolean) => void;
  newAttDate: string;
  setNewAttDate: (date: string) => void;
  newAttStatus: AttendanceRecord['status'];
  setNewAttStatus: (status: AttendanceRecord['status']) => void;
  newAttMemo: string;
  setNewAttMemo: (memo: string) => void;
  newAttClassId: string;
  setNewAttClassId: (classId: string) => void;
  attendanceClassOptions: ClassItem[];
  onSaveAttendance: (e: React.FormEvent) => void;
}

function classOptionLabel(cls: ClassItem): string {
  const days = (cls.daysOfWeek || []).join('');
  const time = cls.startTime || '';
  return [cls.name, days && time ? `${days} ${time}` : days || time].filter(Boolean).join(' · ');
}

export const StudentDetailAttendanceTab: React.FC<StudentDetailAttendanceTabProps> = ({
  allAttendance,
  totalAttCount,
  presentCount,
  attRate,
  isAddAttOpen,
  setIsAddAttOpen,
  newAttDate,
  setNewAttDate,
  newAttStatus,
  setNewAttStatus,
  newAttMemo,
  setNewAttMemo,
  newAttClassId,
  setNewAttClassId,
  attendanceClassOptions,
  onSaveAttendance,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-900">출결 이력 및 출석률</h4>
        <p className="text-xs text-slate-500">
          총 {totalAttCount}회 중 출석 {presentCount}회 (출석률 {attRate}%)
        </p>
      </div>
      <button
        onClick={() => setIsAddAttOpen(true)}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> 출결 기록 추가
      </button>
    </div>

    {isAddAttOpen && (
      <form onSubmit={onSaveAttendance} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
        <h5 className="text-xs font-bold text-indigo-900">새 출결 기록 등록</h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">날짜</label>
            <input
              type="date"
              value={newAttDate}
              onChange={(e) => setNewAttDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">상태</label>
            <select
              value={newAttStatus}
              onChange={(e) => setNewAttStatus(e.target.value as AttendanceRecord['status'])}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
            >
              <option value="present">출석</option>
              <option value="absent">결석</option>
              <option value="late">지각</option>
              <option value="early_leave">조퇴</option>
              <option value="make_up">보강</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">메모/사유</label>
            <input
              type="text"
              placeholder="사유 또는 메모..."
              value={newAttMemo}
              onChange={(e) => setNewAttMemo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {attendanceClassOptions.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            이 날짜에 등록된 반 일정이 없어 「일반 수업」으로 기록됩니다.
          </p>
        ) : attendanceClassOptions.length === 1 ? (
          <p className="text-[11px] text-slate-600">
            대상 반: <span className="font-bold text-slate-800">{classOptionLabel(attendanceClassOptions[0])}</span>
          </p>
        ) : (
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">대상 반</label>
            <select
              value={newAttClassId}
              onChange={(e) => setNewAttClassId(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
            >
              <option value="">반을 선택하세요</option>
              {attendanceClassOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {classOptionLabel(cls)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsAddAttOpen(false)}
            className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            저장
          </button>
        </div>
      </form>
    )}

    {allAttendance.length === 0 ? (
      <p className="text-xs text-slate-500 p-8 text-center bg-slate-50 rounded-2xl">출결 기록이 없습니다.</p>
    ) : (
      <div className="space-y-2">
        {allAttendance.map((att) => {
          const badge = getAttendanceBadge(att.status);
          return (
            <div
              key={att.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg font-bold border ${badge.bg}`}>
                  {badge.label}
                </span>
                <div>
                  <span className="font-bold text-slate-800">{att.date}</span>
                  <span className="text-slate-500 ml-2">({att.className})</span>
                </div>
              </div>
              <div className="text-right">
                {att.absentReason && (
                  <span className="text-rose-600 font-medium mr-2">사유: {att.absentReason}</span>
                )}
                {att.memo && <span className="text-slate-600">{att.memo}</span>}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
