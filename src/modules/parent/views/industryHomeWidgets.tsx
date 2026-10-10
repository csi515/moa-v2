import React, { useMemo } from 'react';
import { StorageService } from '@/services/storage';
import { LessonService } from '@/core/lessons';
import { ScheduleService } from '@/core/services/scheduleService';
import { formatCurrency } from '@/utils/formatters';
import { formatSessionTime } from '@/capabilities/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import { useStorageRefresh } from '@/hooks';
import { CARE_JOURNAL_MOOD_LABEL, MEDICATION_STATUS_LABEL, PICKUP_OUTSIDE_LABEL } from '@/types/care';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { Section } from './shared';
import { EmptyState } from '@/shared/components';
import { ChevronRight } from 'lucide-react';
import {
  getTodayClasses,
  getUpcomingWeekOccurrences,
} from '../utils/parentScheduleHelpers';
import { registerParentHomeWidgetSlot, type ParentHomeWidgetSlotProps } from '../slots/parentPortalSlots';

// --- 1. 어린이집 홈 위젯 ---
export function DaycareHomeWidget({ student, onNavigate }: ParentHomeWidgetSlotProps) {
  const refreshKey = useStorageRefresh();
  const latestIncident = useMemo(
    () =>
      StorageService.getCareIncidents()
        .filter((item) => item.studentId === student.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0],
    [student.id, refreshKey]
  );

  const latestJournal = useMemo(
    () =>
      StorageService.getCareJournals()
        .filter((j) => j.studentId === student.id)
        .sort((a, b) => b.journalDate.localeCompare(a.journalDate))[0],
    [student.id, refreshKey]
  );

  const todayPickup = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return StorageService.getCarePickupLogs()
      .filter((log) => log.studentId === student.id && log.pickupDate === today)
      .sort((a, b) => b.pickedUpAt.localeCompare(a.pickedUpAt))[0];
  }, [student.id, refreshKey]);

  const pendingMeds = useMemo(
    () =>
      StorageService.getMedicationRequests().filter(
        (r) => r.studentId === student.id && r.status === 'requested'
      ),
    [student.id, refreshKey]
  );

  return (
    <div className="space-y-4">
      <Section title="오늘의 알림장">
        {latestJournal ? (
          <button
            type="button"
            onClick={() => onNavigate('journals')}
            className="w-full text-left rounded-xl p-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 min-h-[52px]"
          >
            <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold mb-1">
              <span>{latestJournal.journalDate}</span>
              {latestJournal.mood && (
                <span>기분: {CARE_JOURNAL_MOOD_LABEL[latestJournal.mood]}</span>
              )}
            </div>
            <p className="text-sm text-slate-800 line-clamp-2">{latestJournal.note}</p>
          </button>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">작성된 알림장이 없습니다.</p>
        )}
      </Section>

      {pendingMeds.length > 0 && (
        <Section title="투약 요청 대기">
          <button
            type="button"
            onClick={() => onNavigate('medications')}
            className="w-full text-left rounded-xl p-3 bg-amber-50/60 hover:bg-amber-50 border border-amber-100 min-h-[52px]"
          >
            <p className="text-xs font-bold text-amber-800 mb-0.5">
              요청 대기: {pendingMeds.length}건
            </p>
            <p className="text-xs text-amber-700">
              {pendingMeds[0].symptom || '투약 요청'} · {MEDICATION_STATUS_LABEL[pendingMeds[0].status]}
            </p>
          </button>
        </Section>
      )}

      {todayPickup && (
        <Section title="오늘 귀가 기록">
          <div className="rounded-xl p-3 bg-slate-50 border border-slate-100 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">
              {PICKUP_OUTSIDE_LABEL[todayPickup.pickupMethod]} · {todayPickup.pickedUpAt.slice(11, 16)}
            </p>
            {todayPickup.receiverName && (
              <p className="text-slate-500 mt-0.5">인계자: {todayPickup.receiverName}</p>
            )}
          </div>
        </Section>
      )}

      {latestIncident && (
        <Section title="최근 사고/특이사항">
          <div className="rounded-xl p-3 bg-rose-50/50 border border-rose-100 text-xs text-rose-800">
            <p className="font-semibold">{latestIncident.occurredAt.slice(0, 10)} 특이사항</p>
            <p className="text-slate-600 mt-0.5">{latestIncident.description}</p>
          </div>
        </Section>
      )}
    </div>
  );
}

// --- 2. 피아노 홈 위젯 ---
export function PianoHomeWidget({ student, onNavigate }: ParentHomeWidgetSlotProps) {
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

  return (
    <div className="space-y-4">
      {todayClasses.length > 0 && (
        <Section title="오늘의 레슨">
          <div className="space-y-2">
            {todayClasses.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                  <p className="text-xs text-indigo-600 font-medium">{c.startTime} ~ {c.endTime}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">오늘</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {assignment && (
        <Section
          title="이번 주 연습 과제"
          action={
            <button
              type="button"
              onClick={() => onNavigate('assignments')}
              className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1 flex items-center"
            >
              전체 <ChevronRight className="w-3.5 h-3.5 inline" />
            </button>
          }
        >
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-700 mb-1">{assignment.title || '주간 과제'}</p>
            <p className="text-xs text-slate-500 line-clamp-2">
              과제 {assignment.items?.length || 0}개 등록됨
            </p>
          </div>
        </Section>
      )}

      {latestLesson && (
        <Section title="최근 레슨 진도">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{latestLesson.date}</span>
              {latestLesson.songTitle && <span className="font-semibold text-slate-700">{latestLesson.songTitle}</span>}
            </div>
            {latestLesson.homework && (
              <p className="text-xs text-slate-600 line-clamp-2">{latestLesson.homework}</p>
            )}
          </div>
        </Section>
      )}

      {weekOccurrences.length > 0 && (
        <Section title="이번 주 수업 일정">
          <ul className="space-y-1.5">
            {weekOccurrences.map((occ, idx) => (
              <li key={idx} className="flex items-center justify-between py-1.5 px-2 text-xs border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-700">{occ.date} ({occ.dayLabel})</span>
                <span className="text-slate-500">{occ.classItem.startTime} - {occ.classItem.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// --- 3. 필라테스/피부 홈 위젯 ---
function formatBookingWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function PilatesHomeWidget({ student, onNavigate }: ParentHomeWidgetSlotProps) {
  const now = new Date().toISOString();
  const upcoming = ScheduleService.getBookings()
    .filter((b) => b.customerId === student.id && b.startsAt >= now && b.status !== 'cancelled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <Section
      title="다가오는 예약"
      action={
        <button
          type="button"
          onClick={() => onNavigate('bookings')}
          className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1 flex items-center"
        >
          예약관리 <ChevronRight className="w-3.5 h-3.5 inline" />
        </button>
      }
    >
      {upcoming.length === 0 ? (
        <button
          type="button"
          onClick={() => onNavigate('bookings')}
          className="w-full text-xs text-slate-500 py-3 min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          예정된 예약이 없습니다. 새 예약을 등록하세요.
        </button>
      ) : (
        <div className="space-y-2">
          {upcoming.slice(0, 3).map((b) => (
            <div key={b.id} className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{b.serviceName || '세션'}</p>
                <p className="text-xs text-teal-700 font-medium">{formatBookingWhen(b.startsAt)}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md">예약확정</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// --- 4. 체육관 홈 위젯 ---
export function GymHomeWidget({ student, organizationId, onNavigate }: ParentHomeWidgetSlotProps) {
  const { todaySession } = useParentAttendanceSessions(organizationId, student.id, 7);
  const classes = StorageService.getClasses().filter((c) =>
    (student.classIds || []).includes(c.id)
  );

  return (
    <div className="space-y-4">
      {todaySession?.checkInAt && (
        <Section title="오늘 출석 시간">
          <p className="text-sm text-slate-700 font-mono">
            입장: {formatSessionTime(todaySession.checkInAt)}
          </p>
        </Section>
      )}

      <Section title="내 수업 반">
        {classes.length === 0 ? (
          <EmptyState title="등록된 수업 반이 없습니다" className="!bg-transparent !border-none !p-4" />
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div key={cls.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {cls.daysOfWeek?.join(', ')} {cls.startTime}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// 위젯 슬롯 초기 등록
export function initIndustryHomeWidgets(): void {
  registerParentHomeWidgetSlot('daycare', DaycareHomeWidget);
  registerParentHomeWidgetSlot('piano', PianoHomeWidget);
  registerParentHomeWidgetSlot('pilates', PilatesHomeWidget);
  registerParentHomeWidgetSlot('skin', PilatesHomeWidget);
  registerParentHomeWidgetSlot('skin_clinic', PilatesHomeWidget);
  registerParentHomeWidgetSlot('gym', GymHomeWidget);
}

// 모듈 로드 시 자동 등록
initIndustryHomeWidgets();
