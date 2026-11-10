import { useEffect, useMemo, useState, type FC, type MouseEvent } from 'react';
import { Clock, CreditCard, Piano, Lock, Ticket } from 'lucide-react';
import { LobbyAttendanceKioskView } from '../kiosk/LobbyAttendanceKioskView';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students';
import { LessonService } from '@/core/lessons';
import { TuitionService } from '@/capabilities/finance';
import { resolveStudentUnpaidBadge, type StudentUnpaidBadgeInfo } from '@/capabilities/billing/studentBillingStatusHelpers';
import { EmptyState, PageHeader } from '@/shared/components';
import type { AttendanceRecord, AttendanceStatus, ClassItem, LessonRecord, Student } from '@/types';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { weekdayFromDate } from '@/shared/utils/weekdayKo';
import { syncLessonHomeworkToWeeklyAssignment } from '../../services/lessonHomeworkSync';
import { syncLessonCurriculumProgress } from '../../services/lessonCurriculumSync';
import { saveAttendanceWithPass } from '@/core/schedules/attendancePassAtomic';
import { notifyParentAbsence } from '@/capabilities/attendance';
import { consumeOpenUncheckedLessons } from '@/core/customer/studentJoinInbox';
import { LessonSessionModal, type LessonSessionForm } from './LessonSessionModal';
import {
  TodayLessonClassList,
  type TodayLessonSessionTarget,
} from './TodayLessonClassList';
import { resolveTodayLessonSaveTeacherId } from './todayLessonSaveTeacherId';
import type { DayOfWeek } from '@/core/staff/workWindow';
import {
  createTemporaryMoveRecord,
  deleteTemporaryMove,
  getActiveTemporaryMovesForDate,
  loadTemporaryMoves,
  saveTemporaryMove,
  swapTemporaryMoves,
  type TemporaryMoveRecord,
} from '../schedule/studentTemporaryMoveHelpers';
import { QuickTemporaryMoveModal } from './QuickTemporaryMoveModal';
import { IssueMakeupTokenModal } from '@/capabilities/makeup_lesson_pass/components/IssueMakeupTokenModal';
import {
  findActiveMakeupTokenForAbsence,
  getPendingMakeupRequests,
} from '@/capabilities/makeup_lesson_pass/infrastructure/makeupLessonStorage';
import { PendingMakeupRequestsModal } from './PendingMakeupRequestsModal';

function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 오늘 수업 타임라인 — 원탭 출결 + 수업 노트 */
export const TodayLessonView: FC<{ compactHeader?: boolean; embedded?: boolean }> = ({
  compactHeader = false,
  embedded = false,
}) => {
  const { currentUser, showToast, openConfirmDialog, setActiveTab } = useApp();
  const refreshKey = useStorageRefresh('lessons');
  const { staffId, scopeStudents, scopeClasses, scopeLessons } = useStaffScope();

  const [target, setTarget] = useState<TodayLessonSessionTarget | null>(null);
  const [uncheckedOnly, setUncheckedOnly] = useState(false);
  const [quickMoveTarget, setQuickMoveTarget] = useState<{
    student: Student;
    fromClass: ClassItem;
  } | null>(null);
  const [tempMoves, setTempMoves] = useState<TemporaryMoveRecord[]>([]);
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [issueMakeupTarget, setIssueMakeupTarget] = useState<{
    student: Student;
    originDate: string;
  } | null>(null);
  const [makeupTokensVersion, setMakeupTokensVersion] = useState(0);
  const [isPendingMakeupsOpen, setIsPendingMakeupsOpen] = useState(false);
  const orgId =
    (currentUser as unknown as { organizationId?: string; tenantId?: string })?.organizationId ||
    (currentUser as unknown as { tenantId?: string })?.tenantId ||
    'default-org';
  const pendingMakeupRequests = useMemo(
    () => getPendingMakeupRequests(orgId),
    [orgId, refreshKey, makeupTokensVersion]
  );

  const today = todayIsoLocal();
  const todayKorean = weekdayFromDate();
  const currentHm = nowHm();

  useEffect(() => {
    if (consumeOpenUncheckedLessons()) setUncheckedOnly(true);
  }, []);

  useEffect(() => {
    setTempMoves(getActiveTemporaryMovesForDate(today));
  }, [refreshKey, today]);

  const students = useMemo(
    () => scopeStudents(StudentService.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const classes = useMemo(
    () =>
      scopeClasses(StorageService.getClasses())
        .filter((c) => c.daysOfWeek.includes(todayKorean as ClassItem['daysOfWeek'][number]))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [scopeClasses, todayKorean, refreshKey]
  );

  const attendance = useMemo(() => StorageService.getAttendance(), [refreshKey]);
  const lessons = useMemo(
    () => scopeLessons(LessonService.getLessonRecords()),
    [scopeLessons, refreshKey]
  );
  const findAttendance = (studentId: string, classId: string): AttendanceRecord | undefined =>
    attendance.find((a) => a.date === today && a.studentId === studentId && a.classId === classId);

  const findLesson = (studentId: string, classId: string): LessonRecord | undefined =>
    lessons.find((l) => l.date === today && l.studentId === studentId && l.classId === classId);

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const cls of classes) {
      const enrolled = students.filter((s) => s.classIds?.includes(cls.id));
      total += enrolled.length;
      done += enrolled.filter((s) => !!findAttendance(s.id, cls.id)).length;
    }
    return { total, done };
  }, [classes, students, attendance, today]);

  const progressPct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  const unpaidTodayStudents = useMemo(() => {
    return students.filter((student) => {
      const summary = TuitionService.getStudentBillingSummary(student.id);
      return (summary.grandUnpaid ?? summary.totalUnpaid) > 0;
    }).length;
  }, [students, refreshKey]);

  const unpaidBadgeMap = useMemo(() => {
    const map: Record<string, StudentUnpaidBadgeInfo | null> = {};
    for (const student of students) {
      const summary = TuitionService.getStudentBillingSummary(student.id);
      const unpaid = summary.grandUnpaid ?? summary.totalUnpaid;
      map[student.id] = resolveStudentUnpaidBadge(
        student.id,
        unpaid,
        student.paymentDay
      );
    }
    return map;
  }, [students, refreshKey]);

  const makeupTokensMap = useMemo(() => {
    const map: Record<string, { daysRemaining: number } | null> = {};
    for (const student of students) {
      const active = findActiveMakeupTokenForAbsence(student.id, today);
      if (active) {
        map[student.id] = { daysRemaining: active.daysRemaining };
      }
    }
    return map;
  }, [students, today, refreshKey, makeupTokensVersion]);

  const persistAttendance = async (
    student: Student,
    classItem: ClassItem,
    status: AttendanceStatus,
    memo?: string
  ): Promise<boolean> => {
    const existingAtt = findAttendance(student.id, classItem.id);
    const result = await saveAttendanceWithPass({
      student,
      nextStatus: status,
      previous: existingAtt || null,
      date: today,
      classId: classItem.id,
      className: classItem.name,
      createdBy: currentUser.name,
      memo: memo?.trim() || undefined,
    });
    if (!result.ok) {
      showToast(result.warning || '출결 저장에 실패했습니다.', 'warning');
      return false;
    }

    if (status === 'absent') {
      notifyParentAbsence({
        studentId: student.id,
        studentName: student.name,
        parentPhone: student.parentPhone,
        className: classItem.name,
        classId: classItem.id,
        date: today,
        reason: memo?.trim() || undefined,
        previousStatus: existingAtt?.status,
      });
    }
    return true;
  };

  const handleQuickStatus = async (
    e: MouseEvent,
    student: Student,
    classItem: ClassItem,
    status: 'present' | 'absent'
  ) => {
    e.stopPropagation();
    if (!(await persistAttendance(student, classItem, status))) return;
    showToast(
      status === 'absent'
        ? `${student.name} 학생 결석 처리되었습니다.`
        : `${student.name} 학생 출석 처리되었습니다.`,
      'success'
    );
    // 원탭 결석/출결: 팝업 강제 없이 1초 만에 즉시 완료. 보강권이 필요한 경우 카드에서 [보강권] 버튼을 선택할 수 있음.
  };

  const sessionHints = useMemo(() => {
    if (!target) {
      return { songSuggestions: [] as string[], homeworkHint: '', inProgressSong: '' };
    }
    const studentId = target.student.id;
    const weekStart = StorageService.getCurrentWeekStart();
    const weekAssignment = StorageService.getWeeklyAssignments(studentId).find(
      (a) => a.weekStart === weekStart
    );
    const curriculumItems = StorageService.getCurriculumItems();
    const progress = StorageService.getCurriculumProgress(studentId);
    const inProgressIds = new Set(
      progress.filter((p) => p.status === 'in_progress').map((p) => p.curriculumItemId)
    );
    const inProgressSong =
      curriculumItems.find((it) => inProgressIds.has(it.id))?.title || '';
    const recentSongs = lessons
      .filter((l) => l.studentId === studentId)
      .slice(0, 8)
      .map((l) => l.songTitle)
      .filter(Boolean);
    const curriculumTitles = curriculumItems.map((it) => it.title).filter(Boolean);
    const assignmentTitles = (weekAssignment?.items || []).map((it) => it.songTitle);
    const songSuggestions = Array.from(
      new Set([...recentSongs, ...assignmentTitles, ...curriculumTitles, inProgressSong].filter(Boolean))
    ).slice(0, 12);
    const homeworkHint =
      weekAssignment?.items?.find((it) => !it.completed)?.instructions ||
      weekAssignment?.items?.[0]?.instructions ||
      '';
    return { songSuggestions, homeworkHint, inProgressSong };
  }, [target, lessons, refreshKey]);

  const handleSave = async (form: LessonSessionForm) => {
    if (!target) return;
    const { student, classItem } = target;

    if (form.status !== 'absent' && !form.songTitle.trim()) {
      showToast('수업 곡/교재를 입력해주세요.', 'warning');
      return;
    }

    if (!(await persistAttendance(student, classItem, form.status, form.memo))) return;

    if (form.status !== 'absent') {
      const existingLesson = findLesson(student.id, classItem.id);
      LessonService.saveLessonRecord({
        ...(existingLesson ? { id: existingLesson.id } : {}),
        studentId: student.id,
        studentName: student.name,
        classId: classItem.id,
        className: classItem.name,
        teacherId: resolveTodayLessonSaveTeacherId({
          staffId,
          classTeacherId: classItem.teacherId,
        }),
        teacherName: currentUser.name,
        date: today,
        songTitle: form.songTitle.trim(),
        progress: form.progress.trim(),
        lessonContent: form.lessonContent.trim(),
        strengths: form.strengths.trim(),
        weaknesses: form.weaknesses.trim(),
        homework: form.homework.trim(),
        nextPlan: form.nextPlan.trim(),
        memo: form.memo.trim(),
      });

      syncLessonHomeworkToWeeklyAssignment({
        studentId: student.id,
        songTitle: form.songTitle,
        homework: form.homework,
        staffId,
      });

      syncLessonCurriculumProgress({
        studentId: student.id,
        songTitle: form.songTitle,
        nextSongTitle: form.nextPlan,
      });
    }

    showToast(
      form.status === 'absent'
        ? `${student.name} 학생 결석 처리되었습니다.`
        : `${student.name} 학생 수업이 저장되었습니다.`,
      'success'
    );
    setTarget(null);
  };

  // 엣지 5 & 6번: 출결 및 수업 기록 이관 헬퍼 (데이터 고아 방지)
  const migrateStudentRecords = (
    studentId: string,
    fromClassId: string,
    targetClass: { id: string; name: string }
  ): boolean => {
    // 1. AttendanceRecord 이관
    const allAtt = StorageService.getAttendance();
    let attChanged = false;
    const nextAtt = allAtt.map((a) => {
      if (a.date === today && a.studentId === studentId && a.classId === fromClassId) {
        attChanged = true;
        return { ...a, classId: targetClass.id, className: targetClass.name };
      }
      return a;
    });
    if (attChanged) {
      StorageService.saveAttendanceBatch(nextAtt);
    }

    // 2. LessonRecord 이관
    const allLessons = LessonService.getLessonRecords();
    let lessonChanged = false;
    for (const l of allLessons) {
      if (l.date === today && l.studentId === studentId && l.classId === fromClassId) {
        LessonService.saveLessonRecord({
          ...l,
          classId: targetClass.id,
          className: targetClass.name,
        });
        lessonChanged = true;
      }
    }
    return attChanged || lessonChanged;
  };

  const handleDropMove = (studentId: string, fromClassId: string, targetClass: ClassItem) => {
    const student = students.find((s) => s.id === studentId);
    const fromClass = classes.find((c) => c.id === fromClassId);
    if (!student || !fromClass) return;

    const record = createTemporaryMoveRecord({
      studentId,
      studentName: student.name,
      originalDay: todayKorean as DayOfWeek,
      originalStartTime: fromClass.startTime,
      targetDay: todayKorean as DayOfWeek,
      targetStartTime: targetClass.startTime,
      targetDate: today,
      weekStartDate: StorageService.getCurrentWeekStart(),
      memo: '당일 타임라인 드래그 이동',
    });
    saveTemporaryMove(record);

    // 엣지 5번: 출결 완료 후 이동 시 기존 출결/레슨 기록 동시 이관
    const recordsMigrated = migrateStudentRecords(studentId, fromClassId, targetClass);

    setTempMoves(getActiveTemporaryMovesForDate(today));
    if (recordsMigrated) {
      showToast(
        `${student.name} 학생의 오늘 출결/수업 기록이 ${targetClass.startTime} (${targetClass.name}) 수업으로 함께 이관되었습니다.`,
        'success'
      );
    } else {
      showToast(
        `${student.name} 학생이 오늘 ${targetClass.startTime} (${targetClass.name}) 수업으로 3초 만에 임시 변경되었습니다.`,
        'success'
      );
    }
  };

  // 엣지 7번: 학생 간 시간 맞교환 (Swap)
  const handleDropSwap = (
    sourceStudentId: string,
    sourceClassId: string,
    targetStudent: Student,
    targetClass: ClassItem
  ) => {
    const sourceStudent = students.find((s) => s.id === sourceStudentId);
    const sourceClass = classes.find((c) => c.id === sourceClassId);
    if (!sourceStudent || !sourceClass) return;

    swapTemporaryMoves({
      studentA: { id: sourceStudent.id, name: sourceStudent.name },
      classA: { startTime: sourceClass.startTime, day: todayKorean as DayOfWeek },
      studentB: { id: targetStudent.id, name: targetStudent.name },
      classB: { startTime: targetClass.startTime, day: todayKorean as DayOfWeek },
      targetDate: today,
    });

    migrateStudentRecords(sourceStudent.id, sourceClass.id, targetClass);
    migrateStudentRecords(targetStudent.id, targetClass.id, sourceClass);

    setTempMoves(getActiveTemporaryMovesForDate(today));
    showToast(
      `${sourceStudent.name} ↔ ${targetStudent.name} 학생 간 오늘 수업 시간이 맞교환되었습니다!`,
      'success'
    );
  };

  // 엣지 6번: 원복 시 임시 슬롯에 작성된 출결/레슨 기록도 원래 반으로 안전 복구 (고아화 방지)
  const handleRevertMove = (moveId: string) => {
    const move = tempMoves.find((m) => m.id === moveId);
    if (move) {
      const targetClass = classes.find((c) => c.startTime === move.targetStartTime);
      const originalClass = classes.find((c) => c.startTime === move.originalStartTime);
      if (targetClass && originalClass) {
        migrateStudentRecords(move.studentId, targetClass.id, originalClass);
      }
    }
    deleteTemporaryMove(moveId);
    setTempMoves(getActiveTemporaryMovesForDate(today));
    showToast('임시 이동이 취소되고 원래 시간표 및 출결 기록이 복구되었습니다.', 'info');
  };

  const headerBlock = compactHeader || embedded ? (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div>
        <p className="text-[11px] font-semibold text-indigo-600">
          {todayKorean}요일 · {today}
        </p>
        <h2 className={`font-extrabold text-slate-900 tracking-tight ${embedded ? 'text-sm' : 'text-lg'}`}>
          오늘 수업
        </h2>
      </div>
      <p className="text-xs font-bold text-slate-500 tabular-nums">
        {stats.done}/{stats.total} 완료
      </p>
    </div>
  ) : (
    <PageHeader
      icon={<Piano className="w-6 h-6" />}
      title="오늘 수업"
      description="오늘 예정된 레슨 일정과 담당 강사별 수강생 목록 실시간 확인"
      actions={
        <button
          type="button"
          onClick={() => setIsKioskActive(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>로비 출결 키오스크 실행</span>
        </button>
      }
    />
  );

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-4 pb-8'}>
      {headerBlock}

      {!embedded && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">처리 현황</p>
                <p className="text-sm font-bold text-slate-900">
                  수업 {classes.length}개 · 학생 {stats.total}명
                </p>
              </div>
            </div>
            <p className="text-2xl font-black text-indigo-700 tabular-nums">{progressPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {unpaidTodayStudents > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-900"
            >
              <CreditCard className="w-4 h-4" />
              오늘 수업 학생 중 미납 {unpaidTodayStudents}명 · 수납 내역 확인하기 →
            </button>
          )}
        </div>
      )}

      {classes.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="오늘 예정된 수업이 없습니다"
          description="정규 일정에 오늘 요일이 포함되어 있는지 확인해 주세요."
          action={
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className="text-xs font-bold text-indigo-600 min-h-[44px]"
            >
              반·일정 관리로 이동
            </button>
          }
        />
      ) : (
        <TodayLessonClassList
          classes={classes}
          students={students}
          currentHm={currentHm}
          uncheckedOnly={uncheckedOnly}
          findAttendance={findAttendance}
          findLesson={findLesson}
          onOpenSession={setTarget}
          onQuickStatus={handleQuickStatus}
          unpaidBadgeMap={unpaidBadgeMap}
          onOpenBilling={(st) => {
            showToast(`${st.name} 학생 수납 관리로 이동합니다.`, 'info');
            setActiveTab('finance');
          }}
          temporaryMoves={tempMoves}
          todayKoreanDay={todayKorean as DayOfWeek}
          onQuickMoveRequest={(st, cls) => setQuickMoveTarget({ student: st, fromClass: cls })}
          onDropMove={handleDropMove}
          onDropSwap={handleDropSwap}
          onRevertMove={handleRevertMove}
          makeupTokensMap={makeupTokensMap}
          onOpenIssueMakeupToken={(st, date) =>
            setIssueMakeupTarget({ student: st, originDate: date || today })
          }
        />
      )}

      <LessonSessionModal
        isOpen={!!target}
        student={target?.student ?? null}
        classItem={target?.classItem ?? null}
        date={today}
        existingLesson={
          target ? findLesson(target.student.id, target.classItem.id) || null : null
        }
        existingStatus={
          target
            ? findAttendance(target.student.id, target.classItem.id)?.status || null
            : null
        }
        songSuggestions={sessionHints.songSuggestions}
        homeworkHint={sessionHints.homeworkHint}
        inProgressSong={sessionHints.inProgressSong}
        onClose={() => setTarget(null)}
        onSave={handleSave}
      />

      <QuickTemporaryMoveModal
        isOpen={!!quickMoveTarget}
        student={
          quickMoveTarget
            ? {
                id: quickMoveTarget.student.id,
                name: quickMoveTarget.student.name,
                shuttleRouteName:
                  (quickMoveTarget.student as unknown as { shuttleRouteName?: string }).shuttleRouteName ||
                  (quickMoveTarget.student as unknown as { shuttleRoute?: string }).shuttleRoute,
                shuttleStopName:
                  (quickMoveTarget.student as unknown as { shuttleStopName?: string }).shuttleStopName,
                latestSongTitle: lessons
                  .filter((l) => l.studentId === quickMoveTarget.student.id)
                  .slice(0, 1)[0]?.songTitle,
                progressMemo: lessons
                  .filter((l) => l.studentId === quickMoveTarget.student.id)
                  .slice(0, 1)[0]?.progress,
              }
            : null
        }
        fromClass={
          quickMoveTarget
            ? {
                id: quickMoveTarget.fromClass.id,
                name: quickMoveTarget.fromClass.name,
                startTime: quickMoveTarget.fromClass.startTime,
                endTime: quickMoveTarget.fromClass.endTime,
                teacherId: quickMoveTarget.fromClass.teacherId,
                teacherName: quickMoveTarget.fromClass.teacherName,
                daysOfWeek: quickMoveTarget.fromClass.daysOfWeek as DayOfWeek[],
              }
            : null
        }
        todayClasses={classes.map((c) => ({
          id: c.id,
          name: c.name,
          startTime: c.startTime,
          endTime: c.endTime,
          teacherId: c.teacherId,
          teacherName: c.teacherName,
          daysOfWeek: c.daysOfWeek as DayOfWeek[],
        }))}
        todayKoreanDay={todayKorean as DayOfWeek}
        onClose={() => setQuickMoveTarget(null)}
        onMoved={(record) => {
          if (quickMoveTarget) {
            const targetClass = classes.find((c) => c.startTime === record.targetStartTime);
            if (targetClass) {
              migrateStudentRecords(
                quickMoveTarget.student.id,
                quickMoveTarget.fromClass.id,
                targetClass
              );
            }
          }
          setTempMoves(getActiveTemporaryMovesForDate(today));
          showToast(
            `${record.studentName} 학생이 오늘 ${record.targetStartTime} 수업으로 임시 변경되었습니다.`,
            'success'
          );
        }}
      />

      {/* 4번: 로비 출결 키오스크 풀스크린 모달 */}
      {isKioskActive && (
        <LobbyAttendanceKioskView
          onExitKiosk={() => setIsKioskActive(false)}
          students={students}
          academyName="모아 음악학원"
        />
      )}

      {/* 대기 중인 보강 신청 확인/승인 모달 */}
      <PendingMakeupRequestsModal
        isOpen={isPendingMakeupsOpen}
        onClose={() => setIsPendingMakeupsOpen(false)}
        requests={pendingMakeupRequests}
        organizationId={orgId}
        reviewerName={currentUser?.name || '원장님'}
        onProcessed={() => {
          setMakeupTokensVersion((v) => v + 1);
          setTempMoves(getActiveTemporaryMovesForDate(today));
          showToast('보강 신청이 승인되어 해당 일자 시간표에 자동 배정되었습니다.', 'success');
        }}
      />

      {/* 결석 보강권 선택적 발급 모달 */}
      {issueMakeupTarget && (
        <IssueMakeupTokenModal
          isOpen={!!issueMakeupTarget}
          student={issueMakeupTarget.student}
          originDate={issueMakeupTarget.originDate}
          academyName={currentUser?.name || '학원'}
          onClose={() => setIssueMakeupTarget(null)}
          onIssued={() => {
            setMakeupTokensVersion((v) => v + 1);
            showToast(
              `${issueMakeupTarget.student.name} 학생의 보강권이 발급되었습니다.`,
              'success'
            );
          }}
        />
      )}
    </div>
  );
};
