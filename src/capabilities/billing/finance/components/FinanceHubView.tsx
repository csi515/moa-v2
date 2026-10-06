import { useMemo, type FC, type ReactNode } from 'react';
import { BarChart3, ChevronRight, CreditCard, Landmark } from 'lucide-react';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { getFeeLabel, isAppointmentIndustry } from '@/core/industry/industryUi';
import type { FinanceHubAreaId, FinanceHubSegmentId } from '@/core/industry/pluginTypes';
import { PageHeader, SegmentedControl } from '@/shared/components';
import {
  areaIdForFinanceSegment,
  financeSegmentDescription,
  resolveFinanceHubNav,
} from '../financeHubNav';
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

const SEGMENT_LABEL: Record<FinanceHubSegment, string> = {
  overview: '요약',
  income: '수입',
  expenses: '지출',
  tuition: '수납',
  unpaid: '미납',
  payroll: '정산',
};

function tabToSegment(
  tab: string,
  financeTabSegment: FinanceHubSegment | null
): FinanceHubSegment {
  if (tab === 'income') return 'income';
  if (tab === 'expenses') return 'expenses';
  if (tab === 'tuition') return 'tuition';
  if (tab === 'unpaid') return 'unpaid';
  if (tab === 'payroll') return 'payroll';
  if (tab === 'finance' && financeTabSegment) return financeTabSegment;
  return 'overview';
}

function areaIcon(id: FinanceHubAreaId): ReactNode {
  if (id === 'billing') return <CreditCard className="w-4 h-4" />;
  return <Landmark className="w-4 h-4" />;
}

/** 재무 업무 영역 허브. 제목과 영역 탭은 플러그인 financeHubNav */
export const FinanceHubView: FC<{ showBilling?: boolean }> = ({ showBilling = true }) => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const billingEnabled = showBilling && !isAppointmentIndustry(industry);
  const feeLabel = getFeeLabel(industry);
  // 탭 기본 이름은 영역명 '수납'. 매니페스트 요금명이 기본값(수강료)과 다를 때만 그 단어를 쓴다.
  const tuitionTabLabel = feeLabel === '수강료' ? '수납' : feeLabel;
  const hubNav = resolveFinanceHubNav(industry);
  const splitAreas = hubNav.areas.length > 0 && billingEnabled;
  const hubTitle = hubNav.title;

  const segment = useMemo(() => {
    const next = tabToSegment(activeTab, splitAreas ? hubNav.financeTabSegment : null);
    if (!billingEnabled && (next === 'tuition' || next === 'unpaid')) return 'overview';
    return next;
  }, [activeTab, billingEnabled, hubNav.financeTabSegment, splitAreas]);

  const activeAreaId = areaIdForFinanceSegment(segment);
  const activeArea =
    hubNav.areas.find((area) => area.id === activeAreaId) ?? hubNav.areas[0];
  const areaLabel = activeArea?.label ?? '';
  const segmentLabel = SEGMENT_LABEL[segment];

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

  const splitOptions = useMemo(
    () =>
      (activeArea?.segments ?? []).map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [activeArea]
  );

  const handleAreaChange = (areaId: FinanceHubAreaId) => {
    if (areaId === activeAreaId) return;
    const area = hubNav.areas.find((item) => item.id === areaId);
    if (!area) return;
    setActiveTab(SEGMENT_TO_TAB[area.entrySegment]);
  };

  const headerDescription =
    hubNav.areas.length > 0
      ? `${areaLabel} › ${segmentLabel} · ${financeSegmentDescription(hubNav, segment)}`
      : undefined;

  return (
    <div className="space-y-3 sm:space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<BarChart3 className="w-6 h-6" />}
        title={hubTitle}
        description={headerDescription}
      />

      {splitAreas && activeArea ? (
        <div className="space-y-3 min-w-0">
          {/* 1단계: 영역 — 큰 터치 타일 */}
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="수납·재무 영역"
          >
            {hubNav.areas.map((area) => (
              <FinanceAreaButton
                key={area.id}
                active={activeAreaId === area.id}
                label={area.label}
                hint={area.hint}
                icon={areaIcon(area.id)}
                onClick={() => handleAreaChange(area.id)}
              />
            ))}
          </div>

          {/* 2단계: 선택한 영역 안의 업무만 */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 px-0.5 flex items-center gap-1">
              <span className="text-slate-500">{areaLabel}</span>
              <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden />
              <span className="text-slate-700">{segmentLabel}</span>
            </p>
            <SegmentedControl
              value={segment}
              options={splitOptions}
              onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
              aria-label={activeArea.menuLabel}
              fullWidth
              className="w-full shadow-xs"
              activeClassName={
                activeArea.id === 'billing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-white'
              }
            />
          </div>
        </div>
      ) : (
        <SegmentedControl
          value={segment}
          options={genericOptions}
          onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
          aria-label={`${hubTitle} 메뉴`}
          fullWidth
          className="w-full shadow-xs sm:w-auto sm:min-w-[280px]"
        />
      )}

      {segment === 'overview' && <FinanceOverviewView embedded />}
      {segment === 'income' && <IncomeManagementView embedded />}
      {segment === 'expenses' && <ExpenseManagementView embedded />}
      {segment === 'payroll' && <TeacherPayrollView embedded />}
      {segment === 'tuition' && <TuitionManagementView embedded />}
      {segment === 'unpaid' && <UnpaidManagementView embedded />}
    </div>
  );
};

function FinanceAreaButton({
  active,
  label,
  hint,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-[52px] rounded-2xl border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span className={active ? 'text-indigo-100' : 'text-slate-400'}>{icon}</span>
        <span className="text-sm font-black leading-none">{label}</span>
      </span>
      <span
        className={`mt-1 block text-[10px] font-bold leading-tight ${
          active ? 'text-indigo-100' : 'text-slate-400'
        }`}
      >
        {hint}
      </span>
    </button>
  );
}
