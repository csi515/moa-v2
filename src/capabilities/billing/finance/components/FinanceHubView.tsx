import { useMemo, type FC } from 'react';
import { BarChart3, CreditCard, ShieldAlert } from 'lucide-react';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { useAppNavigation } from '@/shared/navigation/useAppNavigation';
import { usePermissions } from '@/core/auth/usePermissions';
import { getFeeLabel, isAppointmentIndustry } from '@/core/industry/industryUi';
import type { FinanceHubSegmentId } from '@/core/industry/pluginTypes';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { resolveFinanceHubNav } from '../financeHubNav';
import { FinanceOverviewView } from './FinanceOverviewView';
import { IncomeManagementView } from './IncomeManagementView';
import { ExpenseManagementView } from './ExpenseManagementView';
import { TuitionManagementView } from '@/capabilities/billing/components/tuition/TuitionManagementView';
import { UnpaidManagementView } from '@/capabilities/billing/components/unpaid/UnpaidManagementView';
import { TeacherPayrollView } from './TeacherPayrollView';

export type FinanceHubSegment = FinanceHubSegmentId;

const SEGMENT_TO_TAB: Record<FinanceHubSegment, NavTab> = {
  overview: 'finance',
  income: 'income',
  expenses: 'expenses',
  tuition: 'tuition',
  unpaid: 'unpaid',
  payroll: 'payroll',
};

function tabToSegment(
  tab: string,
  isBillingView: boolean
): FinanceHubSegment {
  if (tab === 'income') return 'income';
  if (tab === 'expenses') return 'expenses';
  if (tab === 'tuition') return 'tuition';
  if (tab === 'unpaid') return 'unpaid';
  if (tab === 'payroll') return 'payroll';
  if (isBillingView) return 'tuition';
  return 'overview';
}

/**
 * 수납 및 재무 업무 영역 허브.
 * - 사용자의 요청에 따라 '수납' 페이지와 '재무 관리' 페이지를 독립적으로 분리하여 공간을 극도로 효율적이고 깨끗하게 유지.
 */
export const FinanceHubView: FC<{ showBilling?: boolean }> = ({ showBilling = true }) => {
  const { activeTab, setActiveTab } = useAppNavigation();
  const { industry, isOwner, isAdmin, canPermission } = usePermissions();
  const hasFinanceAccess = isOwner || isAdmin || canPermission('finance.read');
  const billingEnabled = showBilling && !isAppointmentIndustry(industry);
  const feeLabel = getFeeLabel(industry);
  const tuitionTabLabel = feeLabel === '수강료' ? '수납' : feeLabel;
  const hubNav = resolveFinanceHubNav(industry);
  const splitAreas = hubNav.areas.length > 0 && billingEnabled;

  // 현재 활성 탭이 수납(tuition, unpaid)인지, 재무(finance, income, expenses, payroll, overview)인지 판별
  const isBillingView = splitAreas && (activeTab === 'tuition' || activeTab === 'unpaid');

  const segment = useMemo(() => {
    return tabToSegment(activeTab, isBillingView);
  }, [activeTab, isBillingView]);

  // 1. 수납 전용 옵션 (수납 청구/납부, 미납 관리)
  const billingOptions = useMemo(
    () => [
      { value: 'tuition' as const, label: `${tuitionTabLabel} 관리` },
      { value: 'unpaid' as const, label: '미납 내역' },
    ],
    [tuitionTabLabel]
  );

  // 2. 재무 관리 전용 옵션 (요약, 수입, 지출, 정산)
  const booksOptions = useMemo(
    () => [
      { value: 'overview' as const, label: '재무 요약' },
      { value: 'income' as const, label: '수입' },
      { value: 'expenses' as const, label: '지출' },
      { value: 'payroll' as const, label: '강사 정산' },
    ],
    []
  );

  // 3. 분리되지 않은 단일 모드 업종용 옵션
  const genericOptions = useMemo(() => {
    const base: { value: FinanceHubSegment; label: string }[] = [
      { value: 'overview', label: '요약' },
      { value: 'income', label: '수입' },
      { value: 'expenses', label: '지출' },
      { value: 'payroll', label: '정산' },
    ];
    if (billingEnabled) {
      base.push(
        { value: 'tuition', label: tuitionTabLabel },
        { value: 'unpaid', label: '미납' }
      );
    }
    return base;
  }, [billingEnabled, tuitionTabLabel]);

  if (!hasFinanceAccess) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900">재무 장부 열람 권한 제한</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            수납 내역 및 매출 장부는 관리자(원장) 또는 재무(finance.read) 권한이 부여된 사용자만 접근할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // --- A. 수납 전용 페이지 분리 뷰 ---
  if (isBillingView) {
    return (
      <div className="space-y-4 pb-4">
        <PageHeader
          density="compact"
          icon={<CreditCard className="w-6 h-6 text-indigo-600" />}
          title={`${tuitionTabLabel} 관리`}
          actions={
            <SegmentedControl
              value={segment === 'unpaid' ? 'unpaid' : 'tuition'}
              options={billingOptions}
              onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
              aria-label="수납 메뉴"
              fullWidth
              className="w-full sm:w-auto min-w-[240px]"
              activeClassName="bg-indigo-600 text-white"
            />
          }
        />

        {segment === 'tuition' && <TuitionManagementView embedded />}
        {segment === 'unpaid' && <UnpaidManagementView embedded />}
      </div>
    );
  }

  // --- B. 재무 관리 전용 페이지 분리 뷰 ---
  if (splitAreas) {
    return (
      <div className="space-y-4 pb-4">
        <PageHeader
          density="compact"
          icon={<BarChart3 className="w-6 h-6 text-slate-800" />}
          title="재무 관리"
          actions={
            <SegmentedControl
              value={segment === 'tuition' || segment === 'unpaid' ? 'overview' : segment}
              options={booksOptions}
              onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
              aria-label="재무 관리 메뉴"
              fullWidth
              className="w-full sm:w-auto min-w-[320px]"
              activeClassName="bg-slate-800 text-white"
            />
          }
        />

        {segment === 'overview' && <FinanceOverviewView embedded />}
        {segment === 'income' && <IncomeManagementView embedded />}
        {segment === 'expenses' && <ExpenseManagementView embedded />}
        {segment === 'payroll' && <TeacherPayrollView embedded />}
      </div>
    );
  }

  // --- C. 단일 모드 업종 (폴백) ---
  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<BarChart3 className="w-6 h-6" />}
        title={hubNav.title}
        actions={
          <SegmentedControl
            value={segment}
            options={genericOptions}
            onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
            aria-label={`${hubNav.title} 메뉴`}
            fullWidth
            className="w-full sm:w-auto min-w-[320px]"
          />
        }
      />

      {segment === 'overview' && <FinanceOverviewView embedded />}
      {segment === 'income' && <IncomeManagementView embedded />}
      {segment === 'expenses' && <ExpenseManagementView embedded />}
      {segment === 'payroll' && <TeacherPayrollView embedded />}
      {segment === 'tuition' && <TuitionManagementView embedded />}
      {segment === 'unpaid' && <UnpaidManagementView embedded />}
    </div>
  );
};
