import { StorageService } from '@/services/storage';
import { TuitionService } from '@/core/finance';
import { LessonService } from '@/core/lessons';
import { ScheduleService } from '@/core/services/scheduleService';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '@/core/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { ChevronRight } from 'lucide-react';
import { Section } from './shared';
import { ParentNoticePreview } from './parentHomeShared';
import {
  getTodayClasses,
  getUpcomingWeekOccurrences,
} from '../utils/parentScheduleHelpers';

/** 피아노학원 학부모 홈 — 오늘·할 일 우선 */
export function PianoParentHome({
  student,
  organizationId,
  onNavigate,
}: {
  student: Student;
  organizationId: string;
  onNavigate: (t: ParentPortalTab) => void;
}) {
  const summary = TuitionService.getStudentBillingSummary(student.id);
  const weekStart = StorageService.getCurrentWeekStart();
  const assignment =
    StorageService.getWeeklyAssignments(student.id).find((a) => a.weekStart === weekStart) ||
    StorageService.getWeeklyAssignments(student.id)[0];
  const latestLesson = LessonService.getLessonRecordsByStudent(student.id).sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];
  const classes = StorageService.getClasses().filter((c) =>
    (student.classIds || []).includes(c.id)
  );
  const todayClasses = getTodayClasses(classes);
  const weekOccurrences = getUpcomingWeekOccurrences(classes).slice(0, 4);
  const makeupItems = StorageService.getMakeupItems().filter(
    (m) => m.studentId === student.id && m.status !== 'completed'
  );
  const pendingMakeup = makeupItems.length;
  const { todaySession, sessions: recentSessions } = useParentAttendanceSessions(
    organizationId,
    student.id,
    5
  );
  const pendingHomework =
    assignment?.items.filter((it) => !it.parentConfirmed).length ?? 0;
  const unpaid = summary.grandUnpaid ?? summary.totalUnpaid;
  const attendanceStatus = getSessionStatusLabel(todaySession);
  const isPassStudent = student.billingMode === 'session_pass';
  const passRemaining = isPassStudent
    ? ScheduleService.getCustomerRemainingSessions(student.id)
    : 0;
  const arrivedInvoice = TuitionService.getInvoicesByStudent(student.id).find(
    (inv) =>
      inv.invoiceSent === true &&
      inv.unpaidAmount > 0 &&
      inv.status !== 'paid' &&
      inv.status !== 'cancelled'
  );

  const todoItems: { label: string; detail: string; tab: ParentPortalTab; warn?: boolean }[] = [];
  if (arrivedInvoice) {
    const monthPart = arrivedInvoice.yearMonth.split('-')[1] || '';
    todoItems.push({
      label: `${monthPart}월 수강료 청구서 도착`,
      detail: formatCurrency(arrivedInvoice.unpaidAmount),
      tab: 'tuition',
      warn: true,
    });
  }
  if (isPassStudent && passRemaining <= 2) {
    todoItems.push({
      label: '회차권 잔여',
      detail: `${passRemaining}회`,
      tab: 'tuition',
      warn: passRemaining === 0,
    });
  }
  if (unpaid > 0 && !arrivedInvoice) {
    todoItems.push({
      label: '미납 확인',
      detail: formatCurrency(unpaid),
      tab: 'tuition',
      warn: true,
    });
  }
  if (pendingHomework > 0) {
    todoItems.push({
      label: '미확인 과제',
      detail: `${pendingHomework}개`,
      tab: 'assignments',
      warn: true,
    });
  }
  if (pendingMakeup > 0) {
    todoItems.push({
      label: '보강',
      detail: `${pendingMakeup}건`,
      tab: 'attendance',
      warn: true,
    });
  }

  return (
    <div className="space-y-4 pb-2">
      {/* 오늘 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900">오늘</h2>
          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1 inline-flex items-center gap-0.5"
          >
            일정 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayClasses.length > 0 ? (
          <ul className="space-y-2">
            {todayClasses.map((cls) => (
              <li
                key={cls.id}
                className="rounded-xl bg-indigo-50/80 border border-indigo-100 px-3 py-2.5"
              >
                <p className="text-base font-extrabold text-slate-900">
                  {cls.startTime}
                  <span className="text-sm font-bold text-slate-600"> – {cls.endTime}</span>
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{cls.name}</p>
                {(cls.teacherName || cls.room) && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {[cls.teacherName, cls.room].filter(Boolean).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 py-1">오늘 예정된 수업이 없습니다.</p>
        )}

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 min-h-[48px] text-left"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500">오늘 출결</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {attendanceStatus.label}
              {todaySession?.checkInAt
                ? ` · ${formatSessionTime(todaySession.checkInAt)}`
                : ''}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </button>
      </section>

      {isPassStudent && (
        <section className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs">
          <button
            type="button"
            onClick={() => onNavigate('tuition')}
            className="w-full flex items-center justify-between gap-2 text-left min-h-[48px]"
          >
            <div>
              <p className="text-[11px] font-bold text-indigo-600">회차권 잔여</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{passRemaining}회</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        </section>
      )}

      {/* 완곡 스탬프 — 미러링 탭 진입 */}
      <section className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs">
        <button
          type="button"
          onClick={() => onNavigate('stamps')}
          className="w-full flex items-center justify-between gap-2 text-left min-h-[48px]"
        >
          <div>
            <p className="text-[11px] font-bold text-indigo-600">완곡 스탬프</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              자녀가 받은 스탬프·완곡 리포트
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </button>
      </section>

      {/* 해야 할 일 */}
      {todoItems.length > 0 && (
        <Section title="해야 할 일">
          <ul className="space-y-2">
            {todoItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 min-h-[48px] text-left border ${
                    item.warn
                      ? 'bg-rose-50 border-rose-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-900">{item.label}</span>
                  <span
                    className={`text-sm font-black ${
                      item.warn ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {item.detail}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 이번 주 */}
      {weekOccurrences.length > 0 && (
        <Section
          title="이번 주 일정"
          action={
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1 inline-flex items-center"
            >
              더보기
            </button>
          }
        >
          <ul className="space-y-2">
            {weekOccurrences.map((occ) => (
              <li
                key={`${occ.date}-${occ.classItem.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 min-h-[44px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {occ.dayLabel} {occ.classItem.startTime} · {occ.classItem.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">{occ.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {latestLesson && (
        <Section
          title="최근 수업 피드백"
          action={
            <button
              type="button"
              onClick={() => onNavigate('assignments')}
              className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1 inline-flex items-center gap-0.5"
            >
              더보기 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="w-full text-left space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-900">{latestLesson.songTitle}</p>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {latestLesson.date}
              </span>
            </div>
            {latestLesson.homework && (
              <p className="text-xs text-slate-600 line-clamp-2">{latestLesson.homework}</p>
            )}
          </button>
        </Section>
      )}

      {recentSessions.length > 0 && (
        <Section title="최근 출결">
          <button type="button" onClick={() => onNavigate('attendance')} className="w-full text-left">
            <ul className="divide-y divide-slate-50">
              {recentSessions.slice(0, 3).map((s) => {
                const status = getSessionStatusLabel(s);
                return (
                  <li
                    key={s.id}
                    className="flex justify-between text-sm py-2.5 min-h-[44px] items-center"
                  >
                    <span className="font-mono text-slate-600">{s.sessionDate}</span>
                    <span className="text-slate-800 font-medium">
                      {status.label}
                      {s.checkInAt ? ` · ${formatSessionTime(s.checkInAt)}` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </button>
        </Section>
      )}

      <ParentNoticePreview
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    </div>
  );
}
