import { type FC, type ReactNode, useMemo, useState } from 'react';
import { Home, Settings, User, Users, UserPlus, ArrowRight, Building2, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { ModuleLabelsProvider } from '@/core/labels';
import { WorkplaceSettingsView } from '@/core/organizations/components/WorkplaceSettingsView';
import { accountViewEntry } from '@/core/industry/commonViewEntries';
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

/** 모듈 미개발 업종 및 신규 업종용 확장형 공통 셸 */
export const GenericIndustryShell: FC<{ viewMap?: Record<string, () => ReactNode> }> = ({ viewMap: externalViewMap }) => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const { allowedTabs, roleLabel, roleBadge, industry, isOwner } = usePermissions();
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type || industry);

  const customerWord = t('customer.singular', '고객');

  const navSections: NavMenuSection[] = useMemo(() => [
    {
      title: '메뉴',
      items: [
        { tab: 'dashboard', label: '홈', icon: <Home className="w-4 h-4" /> },
        { tab: 'students', label: `${customerWord} 관리`, icon: <Users className="w-4 h-4" /> },
        { tab: 'settings', label: '설정', icon: <Settings className="w-4 h-4" /> },
        { tab: 'account', label: '내 계정', icon: <User className="w-4 h-4" /> },
      ],
    },
  ], [customerWord]);

  const mainTabs = useMemo(() => navSections[0].items, [navSections]);

  const filteredSections = useMemo(
    () => filterNavSections(navSections, allowedTabs),
    [navSections, allowedTabs]
  );

  useTabGuard();

  const defaultViewMap: Record<string, () => ReactNode> = {
    dashboard: () => <GenericDashboardView onNavigate={setActiveTab} />,
    students: () => <StudentListView />,
    settings: () => <WorkplaceSettingsView />,
    ...accountViewEntry,
  };

  const viewMap = externalViewMap || defaultViewMap;

  const renderView = viewMap[activeTab] ?? viewMap.dashboard;

  return (
    <ModuleLabelsProvider>
      <div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">
        {isOwner && <DirectorFloatingFab />}
        {renderView()}
      </div>
    </ModuleLabelsProvider>
  );
};

