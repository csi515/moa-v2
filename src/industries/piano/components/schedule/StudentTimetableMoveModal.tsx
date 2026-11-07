import { useState, useMemo, type FC } from 'react';
import { ArrowRight, Calendar, Check, CheckCircle2, Clock, MoveRight, User, Users, X } from 'lucide-react';
import { Modal } from '@/shared/components';
import type { DayOfWeek } from '@/core/staff/workWindow';
import { TIMETABLE_DAYS, type SlotPlacement } from './pianoTimetablePlacement';
import {
  resolveAvailableMoveSlots,
  type MoveSlotOption,
  type StudentLike,
  type ClassItemLike,
} from './studentTimetableMoveHelpers';

export interface StudentTimetableMoveModalProps {
  isOpen: boolean;
  placement: SlotPlacement | null;
  classes: any[];
  students: StudentLike[];
  onClose: () => void;
  onConfirmMove: (params: {
    placement: SlotPlacement;
    targetDay: DayOfWeek;
    targetStartTime: string;
    isTemporary?: boolean;
  }) => Promise<void> | void;
}

export const StudentTimetableMoveModal: FC<StudentTimetableMoveModalProps> = ({
  isOpen,
  placement,
  classes,
  students,
  onClose,
  onConfirmMove,
}) => {
  if (!placement) return null;

  const currentDay = (placement.classItem.daysOfWeek?.[0] || '월') as DayOfWeek;
  const currentStartTime = placement.classItem.startTime || '14:00';

  const [targetDay, setTargetDay] = useState<DayOfWeek>(currentDay);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 대상 요일의 사용 가능한 시간대 슬롯들
  const slotOptions = useMemo(() => {
    return resolveAvailableMoveSlots({
      classes: classes as ClassItemLike[],
      students,
      targetDay,
      currentDay,
      currentStartTime,
      currentStudentId: placement.student.id,
    });
  }, [classes, students, targetDay, currentDay, currentStartTime, placement.student.id]);

  const handleDaySelect = (day: DayOfWeek) => {
    setTargetDay(day);
    setSelectedSlot('');
  };

  const handleSlotSelect = (slot: MoveSlotOption) => {
    if (slot.isCurrent) return;
    setSelectedSlot(slot.startTime);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await onConfirmMove({
        placement,
        targetDay,
        targetStartTime: selectedSlot,
        isTemporary,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${placement.student.name} 학생 수업 시간표 이동`}
      maxWidth="lg"
    >
      <div className="space-y-4 p-5 pb-6">
        {/* 1. 현재 배정 정보 & 이동 화살표 프리뷰 */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              현재 시간표
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {currentDay}요일 {currentStartTime}
              </span>
              <span className="text-xs text-slate-600 font-semibold truncate">
                {placement.classItem.teacherName || placement.classItem.name}
                {placement.classItem.room ? ` · ${placement.classItem.room}` : ''}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center text-slate-400">
            <MoveRight className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              이동할 대상
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-colors ${
                  selectedSlot
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-400 border-dashed border-slate-300'
                }`}
              >
                {selectedSlot
                  ? `${targetDay}요일 ${selectedSlot}`
                  : '아래에서 시간대를 선택하세요'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. 요일 선택 칩 바 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>이동할 요일 선택</span>
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {TIMETABLE_DAYS.map((day) => {
              const isSelected = targetDay === day;
              const isToday = currentDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span
                      className={`block text-[9px] mt-0.5 ${
                        isSelected ? 'text-indigo-200' : 'text-indigo-600'
                      }`}
                    >
                      (현재)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 시간대 슬롯 목록 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{targetDay}요일 시간대 선택</span>
            </label>
            <span className="text-[11px] text-slate-400">
              클릭하여 1탭 선택
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
            {slotOptions.map((slot) => {
              const isChosen = selectedSlot === slot.startTime;
              const isCurrent = slot.isCurrent;
              const isFull = slot.isFull;

              return (
                <button
                  key={slot.startTime}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleSlotSelect(slot)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                      : isChosen
                      ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {slot.startTime}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-slate-400">
                        현재 위치
                      </span>
                    ) : isChosen ? (
                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${
                        isFull ? 'text-rose-600 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {slot.currentCount}/{slot.maxCapacity}명
                      {isFull && ' (마감)'}
                    </span>
                    {slot.teacherName && (
                      <span className="text-slate-400 truncate max-w-[70px]">
                        {slot.teacherName}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 이동 옵션 (정규 변경 vs 임시 보강) */}
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTemporary}
              onChange={(e) => setIsTemporary(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-800">
              이번 주 하루만 임시 이동 (보강 / 일정 변경)
            </span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6">
            체크하지 않으면 정규 시간표가 영구적으로 변경됩니다.
          </p>
        </div>

        {/* 5. 확인 버튼 */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || submitting}
            className="flex-[1.4] min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              '이동 처리 중...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>선택한 시간대로 이동하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
