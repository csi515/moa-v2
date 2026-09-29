import { StorageService } from '@/services/storage';
import { TuitionService } from '@/core/finance';
import { formatCurrency } from '@/utils/formatters';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '@/core/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import { useStorageRefresh } from '@/hooks';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { SummaryMetricCard } from '@/shared/components';
import { Section } from './shared';
import { ParentHeroCard, ParentNoticePreview } from './parentHomeShared';

/** 체육관 학부모 홈 */
export function GymParentHome({
  student,
  organizationId,
  onNavigate,
}: {
  student: Student;
  organizationId: string;
  onNavigate: (t: ParentPortalTab) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const refreshKey = useStorageRefresh();
  const summary = TuitionService.getStudentBillingSummary(student.id);
  const { todaySession } = useParentAttendanceSessions(organizationId, student.id, 7);
  const classes = StorageService.getClasses().filter((c) =>
    (student.classIds || []).includes(c.id)
  );
  const upcomingEvents = StorageService.getEvents()
    .filter((e) => {
      if (e.startDate < today) return false;
      if (!e.participantIds || e.participantIds.length === 0) return true;
      return e.participantIds.includes(student.id);
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);
  const sessionStatus = getSessionStatusLabel(todaySession);
  const todayRides = StorageService.getShuttleRideRequests().filter(
    (r) => r.studentId === student.id && r.rideDate === today && r.status !== 'cancelled'
  );
  void refreshKey;

  return (
    <div className="space-y-4">
      <ParentHeroCard
        student={student}
        subtitle={student.grade || '체육관'}
        gradientClass="bg-gradient-to-br from-amber-600 to-orange-800"
      />

      <div className="grid grid-cols-2 gap-3">
        <SummaryMetricCard
          label="오늘 출입"
          value={sessionStatus.label}
          onClick={() => onNavigate('attendance')}
        />
        <SummaryMetricCard
          label="오늘 차량"
          value={todayRides.length > 0 ? `${todayRides.length}건` : '신청'}
          onClick={() => onNavigate('shuttle')}
        />
      </div>

      <SummaryMetricCard
        label="미납 수강료"
        value={formatCurrency(summary.grandUnpaid ?? summary.totalUnpaid)}
        variant={(summary.grandUnpaid ?? summary.totalUnpaid) > 0 ? 'rose' : 'default'}
        onClick={() => onNavigate('tuition')}
      />

      {todaySession?.checkInAt && (
        <Section title="오늘 출석">
          <p className="text-sm text-slate-700 font-mono">
            {formatSessionTime(todaySession.checkInAt)}
          </p>
        </Section>
      )}

      <Section title="내 수업 반">
        {classes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">등록된 수업 반이 없습니다.</p>
        ) : (
          <button type="button" onClick={() => onNavigate('schedule')} className="w-full text-left space-y-2">
            {classes.map((cls) => (
              <p key={cls.id} className="text-sm text-slate-700">
                <span className="font-bold">{cls.name}</span>
                <span className="text-xs text-slate-500 ml-2">
                  {cls.daysOfWeek.join('·')} {cls.startTime}–{cls.endTime}
                </span>
              </p>
            ))}
          </button>
        )}
      </Section>

      <Section title="다가오는 일정">
        {upcomingEvents.length === 0 ? (
          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="w-full text-sm text-slate-500 py-2"
          >
            예정된 일정이 없습니다
          </button>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onNavigate('events')} className="w-full text-left">
                  <p className="text-sm font-bold text-slate-800">{e.title}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{e.startDate}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ParentNoticePreview
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    </div>
  );
}
