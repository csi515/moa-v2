import { useState, useMemo, useEffect, useRef, type FC } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, Repeat, Search, Sparkles, UserCheck, UserPlus, X, Calendar } from 'lucide-react';
import type { DayOfWeek, Student, MakeupItem, Teacher } from '@/types';
import { StorageService } from '@/services/storage';
import { scheduleMakeupAtomic } from '@/core/schedules/makeupScheduleAtomic';
import { useApp } from '@/context/AppContext';
import { useTerminology } from '@/core/terminology';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { resolvePianoLessonMinutes, addMinutesToClock } from '../../config/pianoLessonMinutes';
import { TIMETABLE_DAYS } from './pianoTimetablePlacement';

interface PianoTimetableStudentPickerProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  students: Student[];
  teachers?: Teacher[];
  rooms?: string[];
  defaultTeacherId?: string;
  defaultRoom?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (student: Student, teacherId?: string, room?: string) => void;
  onClose: () => void;
  excludeIds?: Set<string>;
  initialDay?: DayOfWeek;
  startTime?: string;
  onConfirmRecurrence?: (
    student: Student,
    days: DayOfWeek[],
    startTime: string,
    teacherId?: string,
    room?: string
  ) => void;
  onMakeupScheduled?: () => void;
}

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

function hangulToChosung(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      result += CHO[Math.floor((code - 0xac00) / 588)];
    } else {
      result += text[i];
    }
  }
  return result;
}

function isChosungQuery(q: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(q);
}

/**
 * 피아노 수업 시간표 — 학생 검색 및 정기 반복 배치 모달
 * - 휴원/퇴원생 배제 (재원생만 가나다순)
 * - 한글 초성 검색 및 학년/학교 검색
 * - 매주 반복 요일 다중 선택
 */
export const PianoTimetableStudentPicker: FC<PianoTimetableStudentPickerProps> = ({
  isOpen,
  title,
  subtitle,
  students,
  teachers = [],
  rooms = [],
  defaultTeacherId,
  defaultRoom,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
  excludeIds,
  initialDay,
  startTime,
  onConfirmRecurrence,
  onMakeupScheduled,
}) => {
  const { showToast, triggerRefresh } = useApp();
  const { t } = useTerminology();
  const customerWord = t('customer.singular', '원생');
  const [pickerMode, setPickerMode] = useState<'regular' | 'makeup'>('regular');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacherId || '');
  const [selectedRoom, setSelectedRoom] = useState<string>(defaultRoom || '');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(() =>
    initialDay ? [initialDay] : ['월']
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedTeacherId(defaultTeacherId || '');
      setSelectedRoom(defaultRoom || '');
    }
  }, [isOpen, defaultTeacherId, defaultRoom]);

  const pendingMakeups = useMemo(() => {
    if (!isOpen) return [];
    return StorageService.getMakeupItems().filter((m) => m.status === 'pending');
  }, [isOpen]);

  const handleScheduleMakeup = async (item: MakeupItem) => {
    if (!startTime) return;
    const duration = resolvePianoLessonMinutes(StorageService.getSettings().defaultLessonMinutes);
    const endTime = addMinutesToClock(startTime, duration);
    const result = await scheduleMakeupAtomic({
      attendanceId: item.attendanceId,
      makeup: {
        date: todayIsoLocal(),
        startTime,
        endTime,
      },
    });

    if (result.ok) {
      showToast(`${item.studentName} 학생의 보강 레슨이 ${startTime}에 배정되었습니다.`, 'success');
      triggerRefresh();
      onClose();
    } else {
      showToast(result.warning || '보강 배정에 실패했습니다.', 'warning');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(null);
      if (initialDay) {
        setSelectedDays([initialDay]);
      }
    }
  }, [isOpen, initialDay]);

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // 최소 1개 요일 유지
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort(
        (a, b) => TIMETABLE_DAYS.indexOf(a) - TIMETABLE_DAYS.indexOf(b)
      );
    });
  };

  const activeStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [students]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeStudents;

    const isChosung = isChosungQuery(q);
    return activeStudents.filter((student) => {
      if (isChosung) {
        const chosung = hangulToChosung(student.name);
        return chosung.includes(q);
      }
      const nameMatch = student.name.toLowerCase().includes(q);
      const schoolMatch = (student.school || '').toLowerCase().includes(q);
      const gradeMatch = (student.grade || '').toLowerCase().includes(q);
      return nameMatch || schoolMatch || gradeMatch;
    });
  }, [activeStudents, searchQuery]);

  const listParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredList.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  const handleConfirm = () => {
    if (!selectedStudent) return;
    const teacherParam = selectedTeacherId || undefined;
    const roomParam = selectedRoom || undefined;
    if (isRecurring && onConfirmRecurrence && startTime) {
      onConfirmRecurrence(selectedStudent, selectedDays, startTime, teacherParam, roomParam);
    } else {
      onSelect(selectedStudent, teacherParam, roomParam);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            {subtitle && <p className="text-xs text-indigo-600 font-semibold mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭: 정기 배치 vs 결석 보강 배정 */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setPickerMode('regular')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
              pickerMode === 'regular'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>정기 레슨 배치</span>
          </button>
          <button
            type="button"
            onClick={() => setPickerMode('makeup')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
              pickerMode === 'makeup'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>결석 보강 배정</span>
            {pendingMakeups.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {pendingMakeups.length}
              </span>
            )}
          </button>
        </div>

        {pickerMode === 'makeup' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {pendingMakeups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">미보강 대기 원생이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">모든 결석 원생의 보강이 완료되었거나 예약되었습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 mb-2">보강 대기 중인 원생을 선택하세요:</p>
                {pendingMakeups.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 rounded-2xl transition"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.studentName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        결석일: {item.date} {item.className ? `· ${item.className}` : ''}
                      </p>
                      {item.reason && (
                        <p className="text-[11px] text-purple-700 mt-1 font-medium">사유: {item.reason}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScheduleMakeup(item)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 min-h-[40px]"
                    >
                      이 시간에 배정
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* 검색 인풋 */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="학생 이름, 초성(ㄱㅁㅈ), 학교, 학년 검색"
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* 학생 목록 (가상화 렌더링) */}
        <div
          ref={listParentRef}
          className="flex-1 overflow-y-auto min-h-[160px] max-h-[300px]"
        >
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              {searchQuery ? '일치하는 학생이 없습니다.' : '등록된 재원생이 없습니다.'}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const student = filteredList[virtualRow.index];
                if (!student) return null;
                const isSelected = selectedStudent?.id === student.id;
                const isAlreadyPlaced = excludeIds?.has(student.id);

                return (
                  <div
                    key={student.id}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full h-full text-left px-4 py-2.5 min-h-[56px] flex items-center justify-between gap-3 transition-colors border-b border-slate-100 ${
                        isSelected
                          ? 'bg-indigo-50/90 text-indigo-950 font-bold border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm truncate">{student.name}</span>
                            {isAlreadyPlaced && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                이 시간 배치됨
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {[student.school, student.grade].filter(Boolean).join(' · ') || '재원생'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="text-xs text-indigo-600 font-bold shrink-0 flex items-center gap-1">
                          <UserCheck className="w-4 h-4" />
                          선택됨
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 반복 설정 및 확인 버튼 */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                매주 반복 (정규 시간표 등록)
              </span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {isRecurring ? '선택한 요일마다 자동 편성' : '단일 요일 배치'}
            </span>
          </div>

          {/* 요일 선택 칩 (반복 활성화 시) */}
          {isRecurring && (
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {TIMETABLE_DAYS.map((day) => {
                const checked = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all ${
                      checked
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          )}

          {/* 선생님 & 강의실(선택) 옵션 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                담당 선생님
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl min-h-[38px] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">선생님 미지정</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>강의실 (피아노방)</span>
                <span className="text-[10px] text-slate-400 font-normal">선택 사항</span>
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl min-h-[38px] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">강의실 미지정 (선택 안 함)</option>
                {rooms.map((roomName) => (
                  <option key={roomName} value={roomName}>
                    {roomName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 배치 완료 액션 버튼 */}
          <button
            type="button"
            disabled={!selectedStudent}
            onClick={handleConfirm}
            className={`w-full py-3 min-h-[48px] rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
              selectedStudent
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {selectedStudent ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>
                  {selectedStudent.name} {customerWord}을(를){' '}
                  {isRecurring ? `${selectedDays.join('·')}요일` : `${initialDay || ''}요일`}{' '}
                  {startTime ? `${startTime}에 ` : ''}배치하기
                </span>
              </>
            ) : (
              `위 목록에서 ${customerWord}을(를) 선택하세요`
            )}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
