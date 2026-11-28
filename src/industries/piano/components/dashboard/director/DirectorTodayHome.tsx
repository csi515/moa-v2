import { useCallback, useMemo, useState, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StorageService } from '@/services/storage';
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
import { DirectorInteractiveOnboardingWizard } from './DirectorInteractiveOnboardingWizard';
import { FavoriteMenuQuickDock } from './FavoriteMenuQuickDock';
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
  const queryClient = useQueryClient();
  const { currentUser } = useApp();
  const { currentOrganization } = useOrganization();
  const { isAdmin, isOwner } = usePermissions();
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
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);

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

    // 2. 미납 원생 수납/독촉 안내 (사업주만 — 재무 탭 접근 가능)
    if (isOwner && unpaidStudentCount > 0) {
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
    isOwner,
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
        invoices={isOwner ? unpaidInvoices : []}
        todayIso={today}
        attendanceCounts={todayAttendanceCounts}
        makeupPendingCount={makeupPendingCount}
        onNavigate={navigate}
        showFinance={isOwner}
      />

      <FavoriteMenuQuickDock onNavigate={navigate} activeTab="dashboard" />

      <section className="bg-white border border-slate-200 rounded-xl py-3.5 px-4 sm:p-5 shadow-xs">
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
                isOwner
                  ? unpaidStudentCount > 0
                    ? `미납 ${unpaidStudentCount}명(${formatCurrency(unpaidTotal)})`
                    : '미납 없음'
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {isEmpty ? (
            <>
              <button
                type="button"
                onClick={() => setIsOnboardingWizardOpen(true)}
                className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>초기 설정 마법사 시작</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('students')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
              >
                원생 직접 등록
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOnboardingWizardOpen(true)}
              className="min-h-[36px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>학원 설정 마법사</span>
            </button>
          )}
        </div>
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
        {isOwner ? (
          <div className="lg:col-span-2">
            <DirectorTodayUnpaidSection
              invoices={unpaidInvoices}
              onOpenUnpaid={() => navigate('unpaid')}
            />
          </div>
        ) : null}
      </div>

      <DirectorInteractiveOnboardingWizard
        isOpen={isOnboardingWizardOpen}
        onClose={() => setIsOnboardingWizardOpen(false)}
        organizationId={currentOrganization?.id}
        onCompleted={() => {
          setIsOnboardingWizardOpen(false);
          queryClient.invalidateQueries();
          StorageService.notifyListeners('*');
        }}
      />
    </div>
  );
};
