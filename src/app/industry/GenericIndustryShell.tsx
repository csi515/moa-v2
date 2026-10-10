import { type FC, type ReactNode, useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Home,
  Settings,
  User,
  Users,
  UserPlus,
  ArrowRight,
  Building2,
  Sparkles,
  Calendar,
  CheckCircle2,
  Ticket,
  Lock,
  Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { WorkplaceSettingsView } from '@/core/organizations/components/WorkplaceSettingsView';
import { accountViewEntry, financeViewEntries } from '@/core/industry/commonViewEntries';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

const AttendanceView = lazy(() =>
  import('@/capabilities/attendance').then((m) => ({ default: m.AttendanceManagementView }))
);
const BookingView = lazy(() =>
  import('@/capabilities/booking/ui/BookingCalendarView').then((m) => ({ default: m.BookingCalendarView }))
);
const PassesView = lazy(() =>
  import('@/pages/passes/list').then((m) => ({ default: m.PassesListPage }))
);
const LockersView = lazy(() =>
  import('@/pages/lockers/grid').then((m) => ({ default: m.LockersGridPage }))
);
const ConsultationView = lazy(() =>
  import('@/capabilities/consultation').then((m) => ({ default: m.ConsultationRecordsView }))
);
import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { DirectorFloatingFab, ToastContainer, ConfirmDialog } from '@/shared/components';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getIndustryLabel, shouldUseGenericShell } from '@/core/industry/types';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { filterNavSections } from '@/core/auth/navUtils';
import { useTerminology } from '@/core/terminology';
import { StudentListView, StudentFormModal } from '@/capabilities/roster';
import { StorageService } from '@/services/storage';

export { shouldUseGenericShell };

interface GenericDashboardViewProps {
  onNavigate: (tab: any) => void;
}

function GenericDashboardView({ onNavigate }: GenericDashboardViewProps) {
  const { currentOrganization } = useOrganization();
  const { industry } = usePermissions();
  const { t } = useTerminology(currentOrganization?.industry_type || industry);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const customerWord = t('customer.singular', '고객');
  const placeWord = t('place.singular', '사업장');
  const industryLabel = getIndustryLabel(currentOrganization?.industry_type || industry);

  const allCustomers = StorageService.getStudents();
  const activeCustomers = allCustomers.filter((c) => c.status === 'active');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 sm:pt-4" data-testid="director-home">
      {/* 환영 및 사업장 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{industryLabel}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currentOrganization?.name || placeWord}
          </h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            {industryLabel} 운영을 위한 범용 워크스페이스입니다. {customerWord} 관리, 일정, 시설 및 설정을 효율적으로 운영해보세요.
          </p>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">전체 {customerWord}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">활동 중인 {customerWord}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">운영 상태</p>
            <p className="text-2xl font-black text-slate-800 mt-1">정상 운영 중</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-between p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 text-indigo-900 hover:bg-indigo-100/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{customerWord} 신규 등록</p>
                <p className="text-xs text-indigo-700/80">맞춤 정보 포함 등록</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-600" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{customerWord} 목록 조회</p>
                <p className="text-xs text-slate-500">전체 명단 및 상세</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{placeWord} 설정</p>
                <p className="text-xs text-slate-500">운영 기본 정보</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {isFormOpen && (
        <StudentFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

export const TAB_REQUIRED_CAPABILITIES: Record<string, readonly string[]> = {
  // 기본 5대 기능 및 재무 허브
  bookings: ['booking', 'seat_room'],
  attendance: ['attendance'],
  passes: ['passes'],
  lockers: ['locker'],
  inventory: ['inventory'],
  finance: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  tuition: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  income: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  expenses: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  payroll: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],

  // 확장 12종 Capability 슬러그 라우트 (URL 슬러그와 1:1 매핑)
  'seat-rooms': ['seat_room', 'booking'],
  rentals: ['rental_equipment'],
  maintenance: ['maintenance_checklist'],
  instructors: ['instructor_match'],
  shifts: ['shift_schedule'],
  pipelines: ['task_pipeline'],
  'billing-invoices': ['billing_invoicing', 'billing'],
  ledger: ['ledger_simple', 'billing'],
  wallets: ['credit_wallet', 'billing'],
  consultations: ['consultation_crm'],
  charts: ['treatment_chart'],
  consents: ['safety_consent'],
};

export function isTabAllowedForCapabilities(tab: string, enabledCaps: readonly string[]): boolean {
  const required = TAB_REQUIRED_CAPABILITIES[tab];
  if (!required) return true;
  return required.some((cap) => enabledCaps.includes(cap));
}

/** 모듈 미개발 업종 및 신규 업종용 확장형 공통 셸 */
export const GenericIndustryShell: FC<{ viewMap?: Record<string, () => ReactNode>; Overlays?: React.ComponentType | null }> = ({ viewMap: externalViewMap, Overlays }) => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const { allowedTabs, roleLabel, roleBadge, industry, isOwner } = usePermissions();
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type || industry);

  const customerWord = t('customer.singular', '고객');

  const preset = useMemo(() => {
    return getIndustryPreset(currentOrganization?.industry_type || industry);
  }, [currentOrganization?.industry_type, industry]);

  const enabledCaps = useMemo(() => {
    const fromSettings = (currentOrganization?.settings as any)?.capabilities;
    if (Array.isArray(fromSettings) && fromSettings.length > 0) return fromSettings as string[];
    return (preset?.capabilities ?? []) as string[];
  }, [currentOrganization?.settings, preset]);

  const navSections: NavMenuSection[] = useMemo(() => {
    const items: NavMenuItem[] = [
      { tab: 'dashboard', label: '홈', icon: <Home className="w-4 h-4" /> },
      { tab: 'students', label: `${customerWord} 관리`, icon: <Users className="w-4 h-4" /> },
    ];

    if (enabledCaps.includes('booking') || enabledCaps.includes('seat_room')) {
      items.push({ tab: 'bookings', label: '예약·공간', icon: <Calendar className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('attendance')) {
      items.push({ tab: 'attendance', label: '출결 관리', icon: <CheckCircle2 className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('passes')) {
      items.push({ tab: 'passes', label: '이용권·회원권', icon: <Ticket className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('locker')) {
      items.push({ tab: 'lockers', label: '사물함·락커', icon: <Lock className="w-4 h-4" /> });
    }
    if (
      enabledCaps.includes('billing_invoicing') ||
      enabledCaps.includes('ledger_simple') ||
      enabledCaps.includes('credit_wallet')
    ) {
      items.push({ tab: 'finance', label: '수납·정산', icon: <Wallet className="w-4 h-4" /> });
    }

    items.push(
      { tab: 'settings', label: '설정', icon: <Settings className="w-4 h-4" /> },
      { tab: 'account', label: '내 계정', icon: <User className="w-4 h-4" /> }
    );

    return [
      {
        title: '메뉴',
        items,
      },
    ];
  }, [customerWord, enabledCaps]);

  const mainTabs = useMemo(() => navSections[0].items, [navSections]);

  const filteredSections = useMemo(
    () => filterNavSections(navSections, allowedTabs),
    [navSections, allowedTabs]
  );

  useTabGuard();

  const { tab: urlTab } = useParams<{ tab?: string }>();
  const location = useLocation();

  const defaultViewMap: Record<string, () => ReactNode> = {
    dashboard: () => <GenericDashboardView onNavigate={setActiveTab} />,
    students: () => <StudentListView />,
    bookings: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">예약 화면을 불러오는 중...</div>}>
        <BookingView />
      </Suspense>
    ),
    'seat-rooms': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공간·좌석 현황을 불러오는 중...</div>}>
        <BookingView />
      </Suspense>
    ),
    attendance: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">출결 화면을 불러오는 중...</div>}>
        <AttendanceView />
      </Suspense>
    ),
    passes: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">이용권 화면을 불러오는 중...</div>}>
        <PassesView />
      </Suspense>
    ),
    lockers: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사물함 화면을 불러오는 중...</div>}>
        <LockersView />
      </Suspense>
    ),
    consultations: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">상담 내역을 불러오는 중...</div>}>
        <ConsultationView />
      </Suspense>
    ),
    'billing-invoices': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">청구서 관리를 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    ledger: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">원장 내역을 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    wallets: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">크레딧 지갑을 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    ...financeViewEntries,
    settings: () => <WorkplaceSettingsView />,
    ...accountViewEntry,
  };

  const viewMap = externalViewMap || defaultViewMap;

  useEffect(() => {
    const candidateTab = urlTab || location.pathname.replace(/^\//, '').split('/')[0];
    if (candidateTab && candidateTab !== 'workspace') {
      setActiveTab(candidateTab);
    }
  }, [urlTab, location.pathname, setActiveTab]);

  const isCurrentTabAllowed = isTabAllowedForCapabilities(activeTab, enabledCaps);

  const renderViewContent = () => {
    if (!isCurrentTabAllowed) {
      return (
        <div className="max-w-xl mx-auto mt-12 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="disabled-feature-notice">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">현재 업종에서는 제공되지 않는 기능입니다</h2>
          <p className="text-xs text-slate-500 mt-1">
            해당 기능이 활성화되지 않은 업종 프리셋입니다. 필요 시 워크스페이스 설정에서 기능을 추가하세요.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      );
    }

    const viewRenderer = viewMap[activeTab];
    if (!viewRenderer) {
      // Capability는 활성화되어 있으나 화면 구현이 Tier 3(화면 연기)인 경우
      if (TAB_REQUIRED_CAPABILITIES[activeTab]) {
        return (
          <div className="max-w-xl mx-auto mt-12 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="deferred-feature-notice">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">화면 준비 중인 기능입니다</h2>
            <p className="text-xs text-slate-500 mt-1">
              해당 기능({activeTab})의 백엔드 도메인 엔진 및 설정 스키마가 정상 활성화되어 있습니다. 전용 화면은 다음 릴리스에서 제공될 예정입니다.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </div>
        );
      }

      // 정의되지 않은 미등록 탭
      if (activeTab !== 'dashboard') {
        return (
          <div className="max-w-xl mx-auto mt-12 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="not-found-notice">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">페이지를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-500 mt-1">
              요청하신 경로({activeTab})는 존재하지 않거나 유효하지 않은 기능입니다.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </div>
        );
      }

      return viewMap.dashboard ? viewMap.dashboard() : null;
    }

    return viewRenderer();
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">
      {isOwner && <DirectorFloatingFab />}
      {Overlays && <Overlays />}
      <PluginErrorBoundary pluginName={activeTab}>
        {renderViewContent()}
      </PluginErrorBoundary>
    </div>
  );
};

