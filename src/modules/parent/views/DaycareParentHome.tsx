import React, { useMemo } from 'react';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { TuitionService } from '@/core/finance';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '@/core/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import { ParentNoticePreview } from './parentHomeShared';
import { CARE_JOURNAL_MOOD_LABEL, MEDICATION_STATUS_LABEL, PICKUP_OUTSIDE_LABEL } from '@/industries/daycare/care';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { SummaryMetricCard } from '@/shared/components';
import { Section } from './shared';

export function DaycareParentHome({
  student,
  organizationId,
  readOnly = false,
  onNavigate,
}: {
  student: Student;
  organizationId: string;
  readOnly?: boolean;
  onNavigate: (t: ParentPortalTab) => void;
}) {
  const summary = TuitionService.getStudentBillingSummary(student.id);
  const { todaySession } = useParentAttendanceSessions(organizationId, student.id, 7);
  const refreshKey = useStorageRefresh();
  const latestIncident = useMemo(
    () =>
      StorageService.getCareIncidents()
        .filter((item) => item.studentId === student.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0],
    [student.id, refreshKey]
  );

  const latestJournal = React.useMemo(
    () =>
      StorageService.getCareJournals()
        .filter((j) => j.studentId === student.id)
        .sort((a, b) => b.journalDate.localeCompare(a.journalDate))[0],
    [student.id]
  );

  const todayPickup = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return StorageService.getCarePickupLogs()
      .filter((log) => log.studentId === student.id && log.pickupDate === today)
      .sort((a, b) => b.pickedUpAt.localeCompare(a.pickedUpAt))[0];
  }, [student.id, refreshKey]);

  const pendingMeds = React.useMemo(
    () =>
      StorageService.getMedicationRequests().filter(
        (r) => r.studentId === student.id && r.status === 'requested'
      ),
    [student.id]
  );

  const sessionStatus = getSessionStatusLabel(todaySession);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-sky-600 to-indigo-800 rounded-2xl p-5 text-white">
        <p className="text-sky-100 text-xs">{student.grade || '원아'}</p>
        <h2 className="text-2xl font-black mt-1">{student.name}</h2>
        <p className="text-sm text-sky-100 mt-1">
          담당: {student.teacherName || '미지정'}
        </p>
        {student.specialNotes && (
          <p className="mt-3 text-xs bg-white/15 rounded-xl px-3 py-2 leading-relaxed">
            주의 · {student.specialNotes}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryMetricCard
          label="오늘 등하원"
          value={sessionStatus.label}
          onClick={() => onNavigate('attendance')}
        />
        <SummaryMetricCard
          label="미납 보육료"
          value={formatCurrency(summary.grandUnpaid ?? summary.totalUnpaid)}
          variant={(summary.grandUnpaid ?? summary.totalUnpaid) > 0 ? 'rose' : 'default'}
          onClick={() => onNavigate('tuition')}
        />
      </div>

      <Section title="오늘 하원">
        {todayPickup ? (
          <p className="text-sm text-slate-700">
            {formatSessionTime(todayPickup.pickedUpAt)} · {todayPickup.pickerName}
            {todayPickup.relation ? ` · ${todayPickup.relation}` : ''}
            {todayPickup.outsideConsent ? ` · ${PICKUP_OUTSIDE_LABEL}` : ''}
          </p>
        ) : (
          <p className="text-sm text-slate-400">아직 하원 기록이 없습니다.</p>
        )}
        <button
          type="button"
          onClick={() => onNavigate('pickups')}
          className="mt-3 w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
        >
          귀가 명단 확인
        </button>
      </Section>

      {todaySession?.checkInAt && (
        <Section title="오늘 등원">
          <p className="text-sm text-slate-700 font-mono">
            {formatSessionTime(todaySession.checkInAt)}
          </p>
          {todaySession.memo && (
            <p className="text-xs text-slate-500 mt-2">메모 · {todaySession.memo}</p>
          )}
        </Section>
      )}

      <Section title="최근 알림장">
        {latestJournal ? (
          <button type="button" onClick={() => onNavigate('journals')} className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold font-mono">{latestJournal.journalDate}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700">
                {CARE_JOURNAL_MOOD_LABEL[latestJournal.mood]}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">{latestJournal.teacherNote}</p>
          </button>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">아직 알림장이 없습니다.</p>
        )}
      </Section>

      <Section title="투약 대기">
        {pendingMeds.length === 0 ? (
          readOnly ? (
            <p className="text-sm text-slate-400 text-center py-4">투약 기록이 없습니다.</p>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('medications')}
              className="w-full text-sm text-slate-500 py-2"
            >
              대기 중인 투약 의뢰가 없습니다 · 의뢰하기
            </button>
          )
        ) : (
          <ul className="space-y-2">
            {pendingMeds.slice(0, 3).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('medications')}
                  className="w-full flex justify-between items-center text-left text-sm"
                >
                  <span className="font-semibold text-slate-800">{m.medicineName}</span>
                  <span className="text-[10px] font-bold text-amber-700">
                    {MEDICATION_STATUS_LABEL[m.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {latestIncident && (
        <Section title="최근 사고 안내">
          <button type="button" onClick={() => onNavigate('incidents')} className="w-full text-left">
            <p className="text-xs text-slate-700 line-clamp-2">{latestIncident.content}</p>
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
