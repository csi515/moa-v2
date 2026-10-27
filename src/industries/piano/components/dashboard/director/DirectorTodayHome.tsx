import { useCallback, useMemo, type FC } from 'react';
import { formatCurrency, formatKoreanDate } from '@/utils/formatters';
import {
  requestOpenConsultationInquiries,
  requestOpenConsultationReservations,
  requestOpenGuardianEnrollments,
  requestOpenMembershipJoins,
} from '@/core/customer/studentJoinInbox';
import { usePianoNavigate } from '@/industries/piano/layout/usePianoNavigate';
import { useDirectorTodayDashboard } from './useDirectorTodayDashboard';
import { DirectorTodayAttendanceSection } from './DirectorTodayAttendanceSection';
import { DirectorTodayScheduleSection } from './DirectorTodayScheduleSection';
import { DirectorTodayTasksSection, type DirectorTodayTaskItem } from './DirectorTodayTasksSection';
import { DirectorTodayUnpaidSection } from './DirectorTodayUnpaidSection';
import { useApp } from '@/context/AppContext';

/** 홈 업무 항목 → 기존 처리 화면 탭 + (필요 시) 딥링크 플래그 */
function openDirectorTodayTask(
  item: DirectorTodayTaskItem,
  navigate: (tab: DirectorTodayTaskItem['tab']) => void
) {
  switch (item.id) {
    case 'inquiry':
      requestOpenConsultationInquiries();
      break;
    case 'enrollment':
      requestOpenGuardianEnrollments();
      break;
    case 'join':
      requestOpenMembershipJoins();
      break;
    case 'reservation':
      requestOpenConsultationReservations();
      break;
    default:
      break;
  }
  navigate(item.tab);
}

/** 원장 홈 — 오늘 일정 → 출결 → 처리할 업무 → 미납 */
export const DirectorTodayHome: FC = () => {
  const { currentUser } = useApp();
  const navigate = usePianoNavigate();
  const data = useDirectorTodayDashboard();

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

  const taskItems = useMemo((): DirectorTodayTaskItem[] => {
    return [
      {
        id: 'inquiry',
        label: '상담 문의',
        count: pendingInquiryCount,
        tab: 'consultations',
        tone: 'indigo',
      },
      {
        id: 'enrollment',
        label: '자녀 등록',
        count: pendingEnrollmentCount,
        tab: 'enrollment-requests',
        tone: 'amber',
      },
      {
        id: 'join',
        label: '자가가입',
        count: pendingJoinCount,
        tab: 'enrollment-requests',
        tone: 'amber',
      },
      {
        id: 'makeup',
        label: '보강 대기',
        count: makeupPendingCount,
        tab: 'makeups',
        tone: 'rose',
      },
      {
        id: 'reservation',
        label: '예약 요청',
        count: pendingReservationCount,
        tab: 'consultations',
        tone: 'emerald',
      },
    ];
  }, [
    pendingInquiryCount,
    pendingEnrollmentCount,
    pendingJoinCount,
    makeupPendingCount,
    pendingReservationCount,
  ]);

  const handleOpenTask = useCallback(
    (item: DirectorTodayTaskItem) => {
      openDirectorTodayTask(item, navigate);
    },
    [navigate]
  );

  const pendingTaskTotal = taskItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4 pb-4 max-w-5xl mx-auto w-full" data-testid="director-home">
      <section className="bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 rounded-2xl px-4 py-3.5 text-white">
        <p className="text-[11px] text-indigo-200 font-semibold">
          {formatKoreanDate(new Date().toISOString())}
        </p>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate mt-0.5">
          안녕하세요, {currentUser.name}님
        </h2>
        <p className="text-xs text-indigo-100/90 mt-1 leading-snug">
          {isEmpty
            ? '먼저 학생을 등록한 뒤, 일정에 배치하고 출결·수납을 관리하세요.'
            : [
                todayClasses.length > 0
                  ? `오늘 수업 ${todayClasses.length}`
                  : '오늘 수업 없음',
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
            className="mt-3 min-h-[44px] px-4 rounded-xl bg-white text-indigo-900 text-sm font-bold"
          >
            학생 등록하기
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DirectorTodayScheduleSection
          todayClasses={todayClasses}
          students={students}
          onOpenSchedule={() => navigate('timetable')}
        />
        <DirectorTodayAttendanceSection
          today={today}
          expectedDay={expectedDay}
          onOpenAttendance={() => navigate('attendance')}
        />
        <DirectorTodayTasksSection items={taskItems} onOpen={handleOpenTask} />
        <DirectorTodayUnpaidSection
          invoices={unpaidInvoices}
          onOpenUnpaid={() => navigate('unpaid')}
        />
      </div>
    </div>
  );
};
