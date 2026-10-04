import { useMemo, type FC, type ReactNode } from 'react';
import { BarChart3, ChevronRight, CreditCard, Landmark } from 'lucide-react';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { useNavSession } from '@/shared/navigation/navSession';
import { usePermissions } from '@/core/auth/usePermissions';
import { getFeeLabel, isAppointmentIndustry } from '@/core/industry/industryUi';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { FinanceOverviewView } from './FinanceOverviewView';
import { IncomeManagementView } from './IncomeManagementView';
import { ExpenseManagementView } from './ExpenseManagementView';
import { TuitionManagementView } from '@/capabilities/billing/components/tuition/TuitionManagementView';
import { UnpaidManagementView } from '@/capabilities/billing/components/unpaid/UnpaidManagementView';
import { TeacherPayrollView } from './TeacherPayrollView';

export type FinanceHubSegment =
  | 'overview'
  | 'income'
  | 'expenses'
  | 'tuition'
  | 'unpaid'
  | 'payroll';

type PianoFinanceArea = 'billing' | 'books';

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

function tabToSegment(tab: string, preferTuitionDefault: boolean): FinanceHubSegment {
  if (tab === 'income') return 'income';
  if (tab === 'expenses') return 'expenses';
  if (tab === 'tuition') return 'tuition';
  if (tab === 'unpaid') return 'unpaid';
  if (tab === 'payroll') return 'payroll';
  if (tab === 'finance' && preferTuitionDefault) return 'tuition';
  return 'overview';
}

function pianoAreaFromSegment(segment: FinanceHubSegment): PianoFinanceArea {
  if (segment === 'income' || segment === 'expenses' || segment === 'payroll') return 'books';
  return 'billing';
}

const PIANO_BILLING_OPTIONS: { value: FinanceHubSegment; label: string }[] = [
  { value: 'tuition', label: '수납' },
  { value: 'unpaid', label: '미납' },
];

const PIANO_BOOKS_OPTIONS: { value: FinanceHubSegment; label: string }[] = [
  { value: 'income', label: '수입' },
  { value: 'expenses', label: '지출' },
  { value: 'payroll', label: '정산' },
];

function pianoSegmentDescription(segment: FinanceHubSegment): string {
  switch (segment) {
    case 'tuition':
      return '월 수강료 청구·수납 처리';
    case 'unpaid':
      return '미납 학생·금액을 확인하고 수납';
    case 'income':
      return '수입 내역과 합계를 확인';
    case 'expenses':
      return '지출 내역과 합계를 확인';
    case 'payroll':
      return '강사 정산 확정 후 지출 등록';
    default:
      return '';
  }
}

/** 재무 업무 영역 허브 — 피아노는 수납 / 재무 관리로 구분 */
export const FinanceHubView: FC<{ showBilling?: boolean }> = ({ showBilling = true }) => {
  const { activeTab, setActiveTab } = useNavSession();
  const { industry } = usePermissions();
  const billingEnabled = showBilling && !isAppointmentIndustry(industry);
  const feeLabel = getFeeLabel(industry);
  // 탭 기본 이름은 영역명 '수납'. 매니페스트 요금명이 기본값(수강료)과 다를 때만 그 단어를 쓴다.
  const tuitionTabLabel = feeLabel === '수강료' ? '수납' : feeLabel;
  const isPiano = industry === 'piano';
  const hubTitle = isPiano ? '수납·재무' : '재무';

  const segment = useMemo(() => {
    const next = tabToSegment(activeTab, isPiano && billingEnabled);
    if (!billingEnabled && (next === 'tuition' || next === 'unpaid')) return 'overview';
    return next;
  }, [activeTab, billingEnabled, isPiano]);

  const pianoArea = pianoAreaFromSegment(segment);
  const pianoAreaLabel = pianoArea === 'billing' ? '수납' : '재무 관리';
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

  const handlePianoAreaChange = (area: PianoFinanceArea) => {
    if (area === pianoArea) return;
    setActiveTab(area === 'billing' ? 'tuition' : 'income');
  };

  const pianoHeaderDescription = isPiano
    ? `${pianoAreaLabel} › ${segmentLabel} · ${pianoSegmentDescription(segment)}`
    : undefined;

  return (
    <div className="space-y-3 sm:space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<BarChart3 className="w-6 h-6" />}
        title={hubTitle}
        description={pianoHeaderDescription}
      />

      {isPiano && billingEnabled ? (
        <div className="space-y-3 min-w-0">
          {/* 1단계: 영역 — 큰 터치 타일 */}
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="수납·재무 영역"
          >
            <PianoAreaButton
              active={pianoArea === 'billing'}
              label="수납"
              hint="청구 · 미납"
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => handlePianoAreaChange('billing')}
            />
            <PianoAreaButton
              active={pianoArea === 'books'}
              label="재무 관리"
              hint="수입 · 지출 · 정산"
              icon={<Landmark className="w-4 h-4" />}
              onClick={() => handlePianoAreaChange('books')}
            />
          </div>

          {/* 2단계: 선택한 영역 안의 업무만 */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 px-0.5 flex items-center gap-1">
              <span className="text-slate-500">{pianoAreaLabel}</span>
              <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden />
              <span className="text-slate-700">{segmentLabel}</span>
            </p>
            <SegmentedControl
              value={segment}
              options={pianoArea === 'books' ? PIANO_BOOKS_OPTIONS : PIANO_BILLING_OPTIONS}
              onChange={(next) => setActiveTab(SEGMENT_TO_TAB[next])}
              aria-label={pianoArea === 'books' ? '재무 관리 메뉴' : '수납 메뉴'}
              fullWidth
              className="w-full shadow-xs"
              activeClassName={
                pianoArea === 'billing'
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

function PianoAreaButton({
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
