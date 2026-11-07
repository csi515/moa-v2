import { useCallback, useMemo, type FC } from 'react';
import { formatCurrency, formatKoreanDate } from '@/utils/formatters';
import {
  requestOpenConsultationInquiries,
  requestOpenConsultationReservations,
} from '@/core/customer/studentJoinInbox';
import { usePianoNavigate } from '@/industries/piano/layout/usePianoNavigate';
import { useDirectorTodayDashboard } from './useDirectorTodayDashboard';
import { DirectorTodayScheduleSection } from './DirectorTodayScheduleSection';
import { DirectorTodayAttendanceSection } from './DirectorTodayAttendanceSection';
import { DirectorTodayTasksSection, type DirectorTodayTaskItem } from './DirectorTodayTasksSection';
import { DirectorTodayUnpaidSection } from './DirectorTodayUnpaidSection';
import { PianoDirector3SecBriefingCard } from './PianoDirector3SecBriefingCard';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { GettingStartedQuestWidget } from '@/app/onboarding/GettingStartedQuestWidget';
import { usePermissions } from '@/core/auth/usePermissions';
import type { NavTab } from '@/context/AppContext';
import { mapExpectedWithDayStatus } from '../../attendance/usePianoExpectedDay';
import { countDayStatuses } from '../../attendance/pianoAttendanceHelpers';

/** 홈 업무 항목 → 기존 처리 화면 탭 + (필요 시) 딥링크 플래그 */
function openDirectorTodayTask(
  item: DirectorTodayTaskItem,
  navigate: (tab: DirectorTodayTaskItem['tab']) => void
) {
  switch (item.id) {
    case 'inquiry':
      requestOpenConsultationInquiries();
      break;
    case 'reservation':
      requestOpenConsultationReservations();
      break;
    default:
      break;
  }
  navigate(item.tab);
}

/** 원장 홈 — Getting Started → 오늘 일정 → 출결 요약 → 처리할 업무 → 미납 */
export const DirectorTodayHome: FC = () => {
  const { currentUser } = useApp();
  const { currentOrganization } = useOrganization();
  const { isAdmin } = usePermissions();
  const navigate = usePianoNavigate();
  const data = useDirectorTodayDashboard();

  const handleQuestNavigate = useCallback(
    (tab: string) => {
      navigate(tab as NavTab);
    },
    [navigate]
  );

  const {
    stats,
    students,
    todayClasses,
    unpaidInvoices,
    unpaidTotal,
    unpaidStudentCount,
    today,
    expectedDay,
    pendingInquiryCount,
    pendingEnrollmentCount,
    pendingJoinCount,
    makeupPendingCount,
    pendingReservationCount,
  } = data;

  const isEmpty = stats.activeStudents === 0;

  const todayAttendanceCounts = useMemo(() => {
    const { expected, dayRecordMap, pinCheckInIds } = expectedDay;
    const rows = mapExpectedWithDayStatus(expected, dayRecordMap, pinCheckInIds);
    return countDayStatuses(rows.map((r) => r.status));
  }, [expectedDay]);

  const taskItems = useMemo((): DirectorTodayTaskItem[] => {
    const items: DirectorTodayTaskItem[] = [];

    // 1. 오늘 출결 미체크 (당일 등원 확인 우선)
    if (todayAttendanceCounts.unchecked > 0) {
      items.push({
        id: 'attendance',
        label: '오늘 출결 미체크',
        count: todayAttendanceCounts.unchecked,
        tab: 'attendance',
        tone: 'indigo',
      });
    }

    // 2. 미납 원생 수납/독촉 안내
    if (unpaidStudentCount > 0) {
      items.push({
        id: 'unpaid',
        label: '미납 수납 대상',
        count: unpaidStudentCount,
        tab: 'unpaid',
        tone: 'rose',
      });
    }

    // 3. 신규 상담 문의
    if (pendingInquiryCount > 0) {
      items.push({
        id: 'inquiry',
        label: '신규 상담 문의',
        count: pendingInquiryCount,
        tab: 'consultations',
        tone: 'indigo',
      });
    }

    // 4. 상담 예약 대기
    if (pendingReservationCount > 0) {
      items.push({
        id: 'reservation',
        label: '상담 예약 대기',
        count: pendingReservationCount,
        tab: 'consultations',
        tone: 'emerald',
      });
    }

    // 5. 보강 대기
    if (makeupPendingCount > 0) {
      items.push({
        id: 'makeup',
        label: '보강 대기',
        count: makeupPendingCount,
        tab: 'makeups',
        tone: 'amber',
      });
    }

    // 6. 보호자/원생 등록 및 가입 요청 (존재하지 않는 가상 탭 enrollment-requests 대신 실제 students 탭으로 안전하게 이동)
    const joinTotal = pendingEnrollmentCount + pendingJoinCount;
    if (joinTotal > 0) {
      items.push({
        id: 'enrollment',
        label: '신규 가입/등록 요청',
        count: joinTotal,
        tab: 'students',
        tone: 'amber',
      });
    }

    return items;
  }, [
    todayAttendanceCounts.unchecked,
    unpaidStudentCount,
    pendingInquiryCount,
    pendingReservationCount,
    makeupPendingCount,
    pendingEnrollmentCount,
    pendingJoinCount,
  ]);

  const handleOpenTask = useCallback(
    (item: DirectorTodayTaskItem) => {
      openDirectorTodayTask(item, navigate);
    },
    [navigate]
  );

  const pendingTaskTotal = taskItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3 sm:space-y-4 pb-4 max-w-5xl mx-auto w-full" data-testid="director-home">
      <PianoDirector3SecBriefingCard
        students={students}
        invoices={unpaidInvoices}
        todayIso={today}
        attendanceCounts={todayAttendanceCounts}
        makeupPendingCount={makeupPendingCount}
        onNavigate={navigate}
      />

      <section className="bg-white border border-slate-200/80 rounded-2xl py-3 px-3.5 sm:p-5 shadow-2xs">
        <p className="text-xs text-slate-400 font-medium">
          {formatKoreanDate(new Date().toISOString())}
        </p>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate mt-0.5">
          안녕하세요, {currentUser.name}님
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-snug">
          {isEmpty
            ? '신규 학생을 등록하고 수업을 시작해보세요.'
            : [
                todayClasses.length > 0
                  ? `오늘 수업 ${todayClasses.length}개 반`
                  : '오늘 수업 없음',
                todayAttendanceCounts.total > 0
                  ? `등원 ${todayAttendanceCounts.present}/${todayAttendanceCounts.total}명`
                  : null,
                pendingTaskTotal > 0 ? `처리할 업무 ${pendingTaskTotal}건` : null,
                unpaidStudentCount > 0
                  ? `미납 ${unpaidStudentCount}명(${formatCurrency(unpaidTotal)})`
                  : '미납 없음',
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
        {isEmpty && (
          <button
            type="button"
            onClick={() => navigate('students')}
            className="mt-3 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            학생 등록하기
          </button>
        )}
      </section>

      {isAdmin && (
        <GettingStartedQuestWidget
          onNavigate={handleQuestNavigate}
          organizationId={currentOrganization?.id}
          industryType={currentOrganization?.industry_type || 'piano'}
          customerWord="원생"
          placeWord="학원"
          compactWhenComplete
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="lg:col-span-2">
          <DirectorTodayScheduleSection
            todayClasses={todayClasses}
            students={students}
            onOpenSchedule={() => navigate('timetable')}
          />
        </div>
        <DirectorTodayAttendanceSection
          today={today}
          expectedDay={expectedDay}
          onOpenAttendance={() => navigate('attendance')}
        />
        <DirectorTodayTasksSection items={taskItems} onOpen={handleOpenTask} />
        <div className="lg:col-span-2">
          <DirectorTodayUnpaidSection
            invoices={unpaidInvoices}
            onOpenUnpaid={() => navigate('unpaid')}
          />
        </div>
      </div>
    </div>
  );
};
