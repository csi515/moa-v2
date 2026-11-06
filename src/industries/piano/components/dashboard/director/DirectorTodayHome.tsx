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
import { DirectorTodayScheduleSection } from './DirectorTodayScheduleSection';
import { DirectorTodayTasksSection, type DirectorTodayTaskItem } from './DirectorTodayTasksSection';
import { DirectorTodayUnpaidSection } from './DirectorTodayUnpaidSection';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { GettingStartedQuestWidget } from '@/app/onboarding/GettingStartedQuestWidget';
import { usePermissions } from '@/core/auth/usePermissions';
import type { NavTab } from '@/context/AppContext';

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

/** 원장 홈 — Getting Started → 오늘 일정 → 처리할 업무 → 미납 */
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
    <div className="space-y-3 sm:space-y-4 pb-4 max-w-5xl mx-auto w-full" data-testid="director-home">
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
        <DirectorTodayTasksSection items={taskItems} onOpen={handleOpenTask} />
        <DirectorTodayUnpaidSection
          invoices={unpaidInvoices}
          onOpenUnpaid={() => navigate('unpaid')}
        />
      </div>
    </div>
  );
};
