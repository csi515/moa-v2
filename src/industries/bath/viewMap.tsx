import { lazy, Suspense, useState, type FC, type ReactNode } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Building2,
  Sparkles,
  ArrowRight,
  UserPlus,
  Lock,
  Ticket,
} from 'lucide-react';
import { WorkplaceSettingsView } from '@/core/organizations/components/WorkplaceSettingsView';
import { accountViewEntry } from '@/core/industry/commonViewEntries';
import { StudentListView, StudentFormModal } from '@/capabilities/roster';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';

const BookingView = lazy(() =>
  import('@/capabilities/booking/ui/BookingCalendarView').then((m) => ({ default: m.BookingCalendarView }))
);
const PassesView = lazy(() =>
  import('@/pages/passes/list').then((m) => ({ default: m.PassesListPage }))
);
const LockersView = lazy(() =>
  import('@/pages/lockers/grid').then((m) => ({ default: m.LockersGridPage }))
);

const bathSettings = () => <WorkplaceSettingsView />;

function BathDashboardView() {
  const { currentOrganization } = useOrganization();
  const { setActiveTab } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const allCustomers = StorageService.getStudents();
  const activeCustomers = allCustomers.filter((c) => c.status === 'active');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 sm:pt-4" data-testid="director-home">
      <div className="bg-gradient-to-r from-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>사우나·찜질방</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currentOrganization?.name || '사우나·찜질방'}
          </h1>
          <p className="text-orange-100 text-sm max-w-xl">
            사우나·찜질방 운영 워크스페이스입니다. 고객 관리, 락커 배정, 이용권 및 시설을 효율적으로 운영하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">전체 고객</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">활동 고객</p>
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

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-between p-4 rounded-2xl border border-orange-100 bg-orange-50/60 text-orange-900 hover:bg-orange-100/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">고객 신규 등록</p>
                <p className="text-xs text-orange-700/80">맞춤 정보 등록</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-orange-600" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lockers')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">락커 배정 현황</p>
                <p className="text-xs text-slate-500">남녀 사물함 배정</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passes')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">이용권 관리</p>
                <p className="text-xs text-slate-500">정기 회원권 및 티켓</p>
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
          onSaved={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}

const BATH_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <BathDashboardView />,
  members: () => <StudentListView />,
  students: () => <StudentListView />,
  lockers: () => (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">사물함 화면을 불러오는 중...</div>}>
      <LockersView />
    </Suspense>
  ),
  passes: () => (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">이용권 화면을 불러오는 중...</div>}>
      <PassesView />
    </Suspense>
  ),
  bookings: () => (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">예약 화면을 불러오는 중...</div>}>
      <BookingView />
    </Suspense>
  ),
  settings: bathSettings,
  notices: bathSettings,
  ...accountViewEntry,
};


export default BATH_VIEW_MAP;
