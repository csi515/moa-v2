import { useState, type FC, type MouseEvent, type DragEvent } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  Users,
  XCircle,
  FileText,
  Edit3,
  CreditCard,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  BookOpen,
  Ticket,
} from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus, ClassItem, LessonRecord, Student } from '@/types';
import type { DayOfWeek } from '@/core/staff/workWindow';
import type { StudentUnpaidBadgeInfo } from '@/capabilities/billing/studentBillingStatusHelpers';
import type { TemporaryMoveRecord } from '../schedule/studentTemporaryMoveHelpers';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '출석',
  late: '지각',
  early_leave: '조퇴',
  absent: '결석',
  make_up: '보강',
};

export type TodayLessonSessionTarget = {
  student: Student;
  classItem: ClassItem;
};

export interface TodayLessonClassListProps {
  classes: ClassItem[];
  students: Student[];
  currentHm: string;
  uncheckedOnly: boolean;
  findAttendance: (studentId: string, classId: string) => AttendanceRecord | undefined;
  findLesson: (studentId: string, classId: string) => LessonRecord | undefined;
  onOpenSession: (target: TodayLessonSessionTarget) => void;
  onQuickStatus: (
    e: MouseEvent,
    student: Student,
    classItem: ClassItem,
    status: 'present' | 'absent'
  ) => void;
  unpaidBadgeMap?: Record<string, StudentUnpaidBadgeInfo | null>;
  onOpenBilling?: (student: Student) => void;
  temporaryMoves?: TemporaryMoveRecord[];
  todayKoreanDay?: DayOfWeek;
  onQuickMoveRequest?: (student: Student, fromClass: ClassItem) => void;
  onDropMove?: (studentId: string, fromClassId: string, targetClass: ClassItem) => void;
  onDropSwap?: (
    sourceStudentId: string,
    sourceClassId: string,
    targetStudent: Student,
    targetClass: ClassItem
  ) => void;
  onRevertMove?: (moveId: string) => void;
  onOpenIssueMakeupToken?: (student: Student, date: string) => void;
  makeupTokensMap?: Record<string, { daysRemaining: number } | null>;
}

export const TodayLessonClassList: FC<TodayLessonClassListProps> = ({
  classes,
  students,
  currentHm,
  uncheckedOnly,
  findAttendance,
  findLesson,
  onOpenSession,
  onQuickStatus,
  unpaidBadgeMap = {},
  onOpenBilling,
  temporaryMoves = [],
  todayKoreanDay,
  onQuickMoveRequest,
  onDropMove,
  onDropSwap,
  onRevertMove,
  onOpenIssueMakeupToken,
  makeupTokensMap = {},
}) => {
  const [dragOverClassId, setDragOverClassId] = useState<string | null>(null);
  const [dragOverStudentId, setDragOverStudentId] = useState<string | null>(null);

  const handleDragStart = (
    e: DragEvent,
    student: Student,
    fromClass: ClassItem
  ) => {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        studentId: student.id,
        studentName: student.name,
        fromClassId: fromClass.id,
        fromStartTime: fromClass.startTime,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, classId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverClassId !== classId) {
      setDragOverClassId(classId);
    }
  };

  const handleDragLeave = (classId: string) => {
    if (dragOverClassId === classId) {
      setDragOverClassId(null);
    }
  };

  const handleDropClass = (e: DragEvent, targetClass: ClassItem) => {
    e.preventDefault();
    setDragOverClassId(null);
    setDragOverStudentId(null);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (data.studentId && data.fromClassId !== targetClass.id) {
        onDropMove?.(data.studentId, data.fromClassId, targetClass);
      }
    } catch {
      // ignore JSON parse error
    }
  };

  // 엣지 7번: 학생 카드 위에 직접 드롭했을 때의 Swap(맞교환) 처리
  const handleDropOnStudentCard = (
    e: DragEvent,
    targetStudent: Student,
    targetClass: ClassItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClassId(null);
    setDragOverStudentId(null);

    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      if (data.studentId && data.studentId !== targetStudent.id) {
        if (onDropSwap && data.fromClassId !== targetClass.id) {
          onDropSwap(data.studentId, data.fromClassId, targetStudent, targetClass);
          return;
        }
        // 동일 반이거나 Swap 미지원 시 일반 클래스 이동으로 위임
        if (data.fromClassId !== targetClass.id) {
          onDropMove?.(data.studentId, data.fromClassId, targetClass);
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3">
      {uncheckedOnly && (
        <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          아직 출결이 없는 학생만 표시합니다.
        </p>
      )}
      {classes.map((cls) => {
        // 정규 등록 학생
        const enrolled = students.filter((s) => s.classIds?.includes(cls.id));

        // 오늘 이 슬롯으로 임시 이동해 온 학생 목록 (targetDay === todayKoreanDay && targetStartTime === cls.startTime)
        const incomingMoves = todayKoreanDay
          ? temporaryMoves.filter(
              (m) =>
                m.targetDay === todayKoreanDay &&
                m.targetStartTime === cls.startTime &&
                !enrolled.some((s) => s.id === m.studentId)
            )
          : [];

        const incomingStudents = incomingMoves
          .map((m) => {
            const st = students.find((s) => s.id === m.studentId);
            return st ? { student: st, tempRecord: m } : null;
          })
          .filter((item): item is { student: Student; tempRecord: TemporaryMoveRecord } => item !== null);

        // 표시 대상 정규 학생 중 오늘 다른 곳으로 이동한 학생 파악
        const regularWithMoves = enrolled.map((student) => {
          const movedOut = todayKoreanDay
            ? temporaryMoves.find(
                (m) =>
                  m.studentId === student.id &&
                  m.originalDay === todayKoreanDay &&
                  m.originalStartTime === cls.startTime
              )
            : undefined;
          return { student, movedOut };
        });

        const activeEnrolledCount =
          regularWithMoves.filter((item) => !item.movedOut).length + incomingStudents.length;

        const classDone =
          regularWithMoves.filter(
            (item) => !item.movedOut && !!findAttendance(item.student.id, cls.id)
          ).length +
          incomingStudents.filter(
            (item) => !!findAttendance(item.student.id, cls.id)
          ).length;

        const isNow =
          !!cls.startTime &&
          !!cls.endTime &&
          cls.startTime <= currentHm &&
          currentHm < cls.endTime;
        const isNext =
          !isNow &&
          !!cls.startTime &&
          cls.startTime > currentHm &&
          classes.find((c) => c.startTime && c.startTime > currentHm)?.id === cls.id;

        const isDropTarget = dragOverClassId === cls.id;

        return (
          <section
            key={cls.id}
            onDragOver={(e) => handleDragOver(e, cls.id)}
            onDragLeave={() => handleDragLeave(cls.id)}
            onDrop={(e) => handleDropClass(e, cls)}
            className={`rounded-2xl border bg-white overflow-hidden shadow-xs transition-all ${
              isDropTarget
                ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20 shadow-md'
                : isNow
                  ? 'border-indigo-300 ring-1 ring-indigo-200'
                  : isNext
                    ? 'border-emerald-200'
                    : 'border-slate-200'
            }`}
          >
            <div
              className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 ${
                isDropTarget
                  ? 'bg-indigo-100/70'
                  : isNow
                    ? 'bg-indigo-50'
                    : isNext
                      ? 'bg-emerald-50/70'
                      : 'bg-slate-50/80'
              }`}
            >
              <div className="min-w-0 flex items-start gap-3">
                <div className="shrink-0 w-14 text-center">
                  <p className="font-mono text-sm font-black text-indigo-700">{cls.startTime}</p>
                  <p className="text-[10px] text-slate-400">~{cls.endTime}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-900 truncate">{cls.name}</p>
                    {isNow && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                        진행 중
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                        다음
                      </span>
                    )}
                    {isDropTarget && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white animate-pulse">
                        여기에 놓아 이동
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {cls.room}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Users className="w-3 h-3" />
                      {classDone}/{activeEnrolledCount}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {enrolled.length === 0 && incomingStudents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">배정된 학생이 없습니다</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {/* 1. 정규 배정 학생 목록 */}
                {regularWithMoves
                  .filter(({ student, movedOut }) => {
                    if (uncheckedOnly && !movedOut) {
                      return !findAttendance(student.id, cls.id);
                    }
                    return true;
                  })
                  .map(({ student, movedOut }) => {
                    const att = findAttendance(student.id, cls.id);
                    const lesson = findLesson(student.id, cls.id);
                    const done = !!att;
                    const isStudentSwapTarget = dragOverStudentId === student.id;

                    // A. 오늘 다른 시간대로 임시 이동된 경우
                    if (movedOut) {
                      return (
                        <li key={student.id} className="bg-slate-50/60 opacity-80">
                          <div className="flex items-center justify-between gap-2 px-3 py-2.5 min-h-[56px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 bg-slate-200 text-slate-600">
                                {student.name.slice(0, 1)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-700 truncate line-through decoration-slate-400">
                                    {student.name}
                                  </p>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    오늘 {movedOut.targetStartTime}으로 임시 변경
                                  </span>
                                  {movedOut.isSwap && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                      시간 맞교환
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {movedOut.memo || '정규 시간표는 유지되며 오늘만 임시 이동되었습니다.'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRevertMove?.(movedOut.id)}
                              className="shrink-0 min-h-[36px] px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="원래 시간대로 복구"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                              <span>원복</span>
                            </button>
                          </div>
                        </li>
                      );
                    }

                    // B. 정상 수강 중인 학생 (엣지 5번: 출결 완료 후에도 draggable 지원!)
                    return (
                      <li
                        key={student.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, student, cls)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragOverStudentId !== student.id) setDragOverStudentId(student.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverStudentId === student.id) setDragOverStudentId(null);
                        }}
                        onDrop={(e) => handleDropOnStudentCard(e, student, cls)}
                        className={`transition-colors ${
                          isStudentSwapTarget
                            ? 'bg-purple-100/70 ring-2 ring-purple-500 ring-inset'
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-stretch gap-1 px-2 sm:px-3 py-2 min-h-[60px]">
                          <button
                            type="button"
                            onClick={() => onOpenSession({ student, classItem: cls })}
                            className="flex-1 text-left flex items-center gap-2.5 min-w-0 hover:bg-indigo-50/50 active:bg-indigo-50 rounded-xl px-1.5 py-1 transition-colors cursor-pointer"
                          >
                            <span
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 cursor-grab active:cursor-grabbing ${
                                done
                                  ? att?.status === 'absent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              }`}
                              title="드래그하여 다른 시간대로 이동하거나 다른 학생과 시간 맞교환"
                            >
                              {student.name.slice(0, 1)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-slate-900 truncate">{student.name}</p>
                                {done && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      att?.status === 'absent'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {STATUS_LABEL[att!.status]}
                                  </span>
                                )}
                                {unpaidBadgeMap[student.id] && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenBilling?.(student);
                                    }}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                                    title={`${unpaidBadgeMap[student.id]!.tooltip} (클릭하여 수납 관리)`}
                                  >
                                    <CreditCard className="w-3 h-3 text-amber-600" />
                                    <span>{unpaidBadgeMap[student.id]!.label}</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {lesson?.songTitle
                                  ? `🎵 ${lesson.songTitle}`
                                  : done
                                  ? '노트 미작성 · 클릭하여 기록'
                                  : '미처리 · 원탭 출석 또는 클릭'}
                              </p>
                            </div>
                          </button>

                          {/* 출석 처리 전: 원클릭 [출석] / [결석] + [오늘만 변경] 퀵 버튼 */}
                          {!done ? (
                            <div className="flex items-center gap-1 shrink-0 pr-1">
                              <button
                                type="button"
                                onClick={(e) => onQuickStatus(e, student, cls, 'present')}
                                className="min-h-[44px] min-w-[50px] px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                aria-label={`${student.name} 즉시 출석`}
                              >
                                출석
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onQuickStatus(e, student, cls, 'absent')}
                                className="min-h-[44px] min-w-[44px] px-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                                aria-label={`${student.name} 결석`}
                              >
                                <XCircle className="w-4 h-4 mx-auto sm:hidden" />
                                <span className="hidden sm:inline">결석</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickMoveRequest?.(student, cls);
                                }}
                                className="min-h-[44px] px-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="오늘만 다른 시간대로 임시 변경"
                                aria-label={`${student.name} 오늘만 시간 임시 변경`}
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                <span className="hidden md:inline text-xs font-bold">임시 변경</span>
                              </button>
                            </div>
                          ) : (
                            /* 엣지 5번: 출석 처리 후에도 [노트 작성/수정] + [임시 변경] 퀵 버튼 유지 */
                            <div className="flex items-center gap-1 shrink-0 pr-1">
                              {/* 결석 상태일 때 보강권 발급 또는 기발급 배지 노출 */}
                              {att?.status === 'absent' && (
                                makeupTokensMap[student.id] ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0"
                                    title={`보강권 발급 완료 (D-${makeupTokensMap[student.id]!.daysRemaining}일 남음)`}
                                  >
                                    <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>보강 D-{makeupTokensMap[student.id]!.daysRemaining}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenIssueMakeupToken?.(student, att?.date || '');
                                    }}
                                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                                    title="사전 결석 건에 대해 유효기간 30일 보강권 1회 발급"
                                    aria-label={`${student.name} 보강권 발급`}
                                  >
                                    <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="hidden sm:inline">보강권</span>
                                  </button>
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenSession({ student, classItem: cls })}
                                className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                  lesson?.songTitle
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                                aria-label={`${student.name} 수업 노트`}
                              >
                                {lesson?.songTitle ? (
                                  <>
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">노트 수정</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="hidden sm:inline">노트 작성</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickMoveRequest?.(student, cls);
                                }}
                                className="min-h-[40px] px-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="오늘만 다른 시간대로 임시 변경 (출결/기록 동시 이관)"
                                aria-label={`${student.name} 오늘만 시간 임시 변경`}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}

                {/* 2. 오늘 이 슬롯으로 임시 이동해 온 학생 목록 */}
                {incomingStudents
                  .filter(({ student }) => {
                    if (uncheckedOnly) {
                      return !findAttendance(student.id, cls.id);
                    }
                    return true;
                  })
                  .map(({ student, tempRecord }) => {
                    const att = findAttendance(student.id, cls.id);
                    const lesson = findLesson(student.id, cls.id);
                    const done = !!att;

                    return (
                      <li
                        key={`incoming_${student.id}`}
                        className="bg-purple-50/40 border-l-4 border-l-purple-500"
                      >
                        <div className="flex items-stretch gap-1 px-2 sm:px-3 py-2 min-h-[60px]">
                          <button
                            type="button"
                            onClick={() => onOpenSession({ student, classItem: cls })}
                            className="flex-1 text-left flex items-center gap-2.5 min-w-0 hover:bg-purple-100/50 active:bg-purple-100 rounded-xl px-1.5 py-1 transition-colors cursor-pointer"
                          >
                            <span
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                done
                                  ? att?.status === 'absent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {student.name.slice(0, 1)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-slate-900 truncate">{student.name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  오늘 임시 ({tempRecord.originalStartTime} ➔ {cls.startTime})
                                </span>
                                {tempRecord.handoverNotes?.latestSong && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200"
                                    title={`진도: ${tempRecord.handoverNotes.progress || ''} | 전달: ${tempRecord.handoverNotes.teacherMemo || ''}`}
                                  >
                                    <BookOpen className="w-3 h-3 text-blue-600" />
                                    인수인계: {tempRecord.handoverNotes.latestSong}
                                  </span>
                                )}
                                {tempRecord.isSwap && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                    맞교환
                                  </span>
                                )}
                                {done && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      att?.status === 'absent'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {STATUS_LABEL[att!.status]}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {lesson?.songTitle
                                  ? `🎵 ${lesson.songTitle}`
                                  : tempRecord.handoverNotes?.latestSong
                                  ? `🎵 ${tempRecord.handoverNotes.latestSong} (${tempRecord.handoverNotes.progress || '진도 인수인계'})`
                                  : tempRecord.memo
                                  ? `메모: ${tempRecord.memo}`
                                  : '임시 보강 참여 · 클릭하여 기록'}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0 pr-1">
                            {!done ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => onQuickStatus(e, student, cls, 'present')}
                                  className="min-h-[44px] min-w-[50px] px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                  aria-label={`${student.name} 즉시 출석`}
                                >
                                  출석
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => onQuickStatus(e, student, cls, 'absent')}
                                  className="min-h-[44px] min-w-[44px] px-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                                  aria-label={`${student.name} 결석`}
                                >
                                  <XCircle className="w-4 h-4 mx-auto sm:hidden" />
                                  <span className="hidden sm:inline">결석</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {att?.status === 'absent' && (
                                  makeupTokensMap[student.id] ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0"
                                      title={`보강권 발급 완료 (D-${makeupTokensMap[student.id]!.daysRemaining}일 남음)`}
                                    >
                                      <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>보강 D-{makeupTokensMap[student.id]!.daysRemaining}</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenIssueMakeupToken?.(student, att?.date || '');
                                      }}
                                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                                      title="사전 결석 건에 대해 유효기간 30일 보강권 1회 발급"
                                      aria-label={`${student.name} 보강권 발급`}
                                    >
                                      <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                                      <span className="hidden sm:inline">보강권</span>
                                    </button>
                                  )
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenSession({ student, classItem: cls })}
                                  className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">노트</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => onRevertMove?.(tempRecord.id)}
                              className="min-h-[44px] px-2 rounded-xl text-slate-400 hover:text-purple-700 hover:bg-purple-100/70 transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="원래 시간대로 복구"
                              aria-label={`${student.name} 임시 이동 원복`}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden md:inline text-xs font-bold">원복</span>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
