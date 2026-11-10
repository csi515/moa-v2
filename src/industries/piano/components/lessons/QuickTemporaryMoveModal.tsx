import React, { useState, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  Sparkles,
  X,
  Check,
  Calendar,
  AlertCircle,
  Bus,
  UserCheck,
  BookOpen,
  Coffee,
} from 'lucide-react';
import type { DayOfWeek } from '@/core/staff/workWindow';
import {
  saveTemporaryMove,
  createTemporaryMoveRecord,
  type TemporaryMoveRecord,
} from '../schedule/studentTemporaryMoveHelpers';

export interface MoveStudentTarget {
  id: string;
  name: string;
  shuttleRouteName?: string;
  shuttleStopName?: string;
  latestSongTitle?: string;
  progressMemo?: string;
}

export interface MoveClassTarget {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
  daysOfWeek?: DayOfWeek[];
}

interface QuickTemporaryMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: MoveStudentTarget | null;
  fromClass: MoveClassTarget | null;
  todayClasses: MoveClassTarget[];
  todayKoreanDay: DayOfWeek;
  onMoved: (record: TemporaryMoveRecord) => void;
}

// 엣지 8번: 원내 브레이크 타임 및 휴게시간 슬롯 정의
export const BREAK_TIME_SLOTS = ['12:00', '12:30', '17:30'];

const COMMON_SLOTS = [
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
];

export const QuickTemporaryMoveModal: React.FC<QuickTemporaryMoveModalProps> = ({
  isOpen,
  onClose,
  student,
  fromClass,
  todayClasses,
  todayKoreanDay,
  onMoved,
}) => {
  const [selectedTargetTime, setSelectedTargetTime] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  // 엣지 1번: 셔틀 확인 체크박스
  const [shuttleConfirmed, setShuttleConfirmed] = useState<boolean>(false);

  // 엣지 5번: 타 강사 인수인계 메모 상태
  const [handoverSong, setHandoverSong] = useState<string>('');
  const [handoverProgress, setHandoverProgress] = useState<string>('');
  const [handoverTeacherMemo, setHandoverTeacherMemo] = useState<string>('');

  // 모달 오픈 시 학생의 최근 진도곡 프리필
  React.useEffect(() => {
    if (student) {
      setHandoverSong(student.latestSongTitle || '');
      setHandoverProgress(student.progressMemo || '');
    }
  }, [student]);

  if (!isOpen || !student || !fromClass) return null;

  // 오늘 다른 수업들의 시작 시간 목록
  const availableClassSlots = todayClasses
    .filter((c) => c.id !== fromClass.id && c.startTime)
    .map((c) => ({
      time: c.startTime,
      className: c.name,
      classId: c.id,
      teacherId: c.teacherId,
      teacherName: c.teacherName,
    }));

  // 선택된 대상 반 및 담당 강사 다름 여부 (엣지 5번)
  const targetClassMatch = availableClassSlots.find((c) => c.time === selectedTargetTime);
  const isDifferentTeacher =
    !!targetClassMatch &&
    !!targetClassMatch.teacherName &&
    !!fromClass.teacherName &&
    targetClassMatch.teacherName !== fromClass.teacherName;

  const isShuttleStudent = !!student.shuttleRouteName || !!student.shuttleStopName;

  const handleApplyMove = (targetTime: string) => {
    if (!targetTime) return;

    // 엣지 8번: 브레이크 타임 선택 차단
    if (BREAK_TIME_SLOTS.includes(targetTime)) {
      alert('해당 시간은 원내 브레이크(소독/휴게) 시간으로 수업을 배정할 수 없습니다.');
      return;
    }

    const matchedClass = availableClassSlots.find((c) => c.time === targetTime);

    const record = createTemporaryMoveRecord({
      studentId: student.id,
      studentName: student.name,
      originalDay: todayKoreanDay,
      originalStartTime: fromClass.startTime,
      targetDay: todayKoreanDay,
      targetStartTime: targetTime,
      memo: memo.trim() || '당일 원클릭 시간 변경',
      // 엣지 5번: 타 강사 인수인계 정보 바인딩
      handoverNotes: isDifferentTeacher
        ? {
            latestSong: handoverSong.trim() || undefined,
            progress: handoverProgress.trim() || undefined,
            teacherMemo: handoverTeacherMemo.trim() || undefined,
          }
        : undefined,
      fromTeacherName: fromClass.teacherName,
      targetTeacherName: matchedClass?.teacherName,
      // 엣지 1번: 셔틀 확인 플래그
      shuttleChecked: isShuttleStudent ? shuttleConfirmed : true,
    });

    saveTemporaryMove(record);
    onMoved(record);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-move-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* 헤더 */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="quick-move-title" className="text-lg font-black text-slate-900 tracking-tight">
                오늘만 임시 변경
              </h2>
              <p className="text-xs text-purple-700 font-semibold mt-0.5">
                정규 시간표는 보존되며 오늘 하루만 다른 슬롯으로 즉시 이동합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 원생 및 현재 슬롯 정보 카드 */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400">변경 대상 원생</span>
              <p className="text-base font-black text-slate-900">{student.name}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400">현재 정규 수업</span>
              <p className="text-sm font-mono font-bold text-indigo-700">
                {fromClass.startTime} ({fromClass.name})
              </p>
              {fromClass.teacherName && (
                <p className="text-[11px] text-slate-500">담당: {fromClass.teacherName} 선생님</p>
              )}
            </div>
          </div>
        </div>

        {/* 엣지 1번: 셔틀 이용 원생 안내 배너 */}
        {isShuttleStudent && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-start gap-2 font-bold text-amber-950">
              <Bus className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p>셔틀 차량 이용 원생 주의</p>
                <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                  {student.shuttleRouteName || '학원 셔틀 탑승 원생'} ({student.shuttleStopName || '지정 정류장'}). 오늘 시간 변경 시 귀가 차량 배차 여부를 보호자와 꼭 확인하세요.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950 pt-1">
              <input
                type="checkbox"
                checked={shuttleConfirmed}
                onChange={(e) => setShuttleConfirmed(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>보호자 자차/도보 픽업 또는 차량 변경 확인 완료</span>
            </label>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. 오늘 개설된 다른 반 슬롯 원클릭 칩 */}
          <div>
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-2.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              오늘 개설된 다른 수업 슬롯 (추천)
            </label>
            {availableClassSlots.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl text-center">
                오늘 예정된 다른 수업이 없습니다. 아래 시간표 슬롯에서 직접 선택해주세요.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableClassSlots.map((cls) => {
                  const isSelected = selectedTargetTime === cls.time;
                  const isBreak = BREAK_TIME_SLOTS.includes(cls.time);
                  return (
                    <button
                      key={cls.classId}
                      type="button"
                      disabled={isBreak}
                      onClick={() => setSelectedTargetTime(cls.time)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isBreak
                          ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                          : isSelected
                            ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500'
                            : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-purple-700">
                          {cls.time}
                        </span>
                        {isBreak && (
                          <span className="text-[10px] font-bold text-slate-400">휴게시간</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate mt-1">
                        {cls.className}
                      </span>
                      {cls.teacherName && (
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {cls.teacherName} 선생님
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 엣지 5번: 타 강사 반 배정 시 [선생님 인수인계 카드] 자동 노출 */}
          {isDifferentTeacher && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-indigo-900">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>선생님 인수인계 (담당 강사 변경)</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                담당 강사가 <strong>{fromClass.teacherName}</strong> 선생님에서 <strong>{targetClassMatch?.teacherName}</strong> 선생님으로 변경됩니다. 오늘 지도할 교재와 진도를 남겨주세요.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 block mb-1">최근 교재/곡명</label>
                  <input
                    type="text"
                    value={handoverSong}
                    onChange={(e) => setHandoverSong(e.target.value)}
                    placeholder="예: 체르니 30번 5번"
                    className="w-full text-xs border border-indigo-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 block mb-1">진도 현황</label>
                  <input
                    type="text"
                    value={handoverProgress}
                    onChange={(e) => setHandoverProgress(e.target.value)}
                    placeholder="예: 8마디 손목 릴랙스"
                    className="w-full text-xs border border-indigo-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-800 block mb-1">전달 주의사항</label>
                <input
                  type="text"
                  value={handoverTeacherMemo}
                  onChange={(e) => setHandoverTeacherMemo(e.target.value)}
                  placeholder="예: 오늘 스타카토 위주로 점검 부탁드립니다."
                  className="w-full text-xs border border-indigo-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* 2. 일반 다빈도 시간대 칩 (엣지 8번: 브레이크 타임 비활성화) */}
          <div>
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              전체 시간대 직접 선택
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-200 rounded-xl">
              {COMMON_SLOTS.map((slot) => {
                const isSelected = selectedTargetTime === slot;
                const isCurrent = fromClass.startTime === slot;
                const isBreak = BREAK_TIME_SLOTS.includes(slot);

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isCurrent || isBreak}
                    onClick={() => setSelectedTargetTime(slot)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                      isBreak
                        ? 'opacity-30 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
                        : isCurrent
                          ? 'opacity-30 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-purple-50'
                    }`}
                    title={isBreak ? '원내 휴게/소독 시간' : isCurrent ? '현재 수업 시간' : undefined}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 변경 메모 */}
          <div>
            <label className="text-xs font-black text-slate-700 mb-1.5 block">
              변경 사유 / 메모 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 병원 진료로 1시간 늦게 등원, 학교 행사 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* 액션 푸터 */}
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => handleApplyMove(selectedTargetTime)}
            disabled={!selectedTargetTime || (isShuttleStudent && !shuttleConfirmed)}
            className={`min-h-[44px] px-6 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
              !selectedTargetTime || (isShuttleStudent && !shuttleConfirmed)
                ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>3초 만에 변경 완료</span>
          </button>
        </div>
      </div>
    </div>
  );
};
