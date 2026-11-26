import React, { useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { useStorageRefresh, useStudentNavigation } from '@/hooks';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import type { StudentUnpaidSummary } from '@/types';
import { StudentService } from '@/core/students';
import type { Student } from '@/types/customer';
import {
  FilterBar,
  FilterTabs,
  PageHeader,
  SearchField,
  SummaryMetricCard,
  StandardDataTable,
  type StandardColumn,
  StatusBadge,
  Button,
  type FilterTabItem,
} from '@/shared/components';
import { formatCurrency, formatPhone } from '@/utils/formatters';
import { CombinedPaymentModal } from '../tuition/CombinedPaymentModal';
import {
  AlertCircle,
  CreditCard,
  BookOpen,
  Phone,
} from 'lucide-react';

type UnpaidFilter = 'all' | 'tuition' | 'textbook' | 'overdue';

const FILTER_TABS: FilterTabItem<UnpaidFilter>[] = [
  { id: 'all', label: '전체 미납' },
  { id: 'overdue', label: '연체' },
];

export const UnpaidManagementView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const { openStudent } = useStudentNavigation();
  const refreshKey = useStorageRefresh();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<UnpaidFilter>('all');
  const [payStudent, setPayStudent] = useState<Student | null>(null);

  const stats = billingStorage.getUnifiedUnpaidStats();
  const summaries = billingStorage.getUnifiedUnpaidSummaries();

  const filterTabs = FILTER_TABS.map((tab) =>
    tab.id === 'overdue' ? { ...tab, count: stats.overdueStudents } : tab
  );

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      if (filterMode === 'overdue' && s.overdueCount === 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.studentName.toLowerCase().includes(q) ||
          studentMatchesGuardianQuery(s.studentId, searchQuery)
        );
      }
      return true;
    });
  }, [summaries, filterMode, searchQuery, refreshKey]);

  const openPayment = (studentId: string) => {
    const st = StudentService.getStudentById(studentId);
    if (st) setPayStudent(st);
  };

  const columns: StandardColumn<StudentUnpaidSummary>[] = useMemo(
    () => [
      {
        key: 'studentName',
        header: `${customerLabel}명`,
        render: (s) => (
          <button
            type="button"
            onClick={() => openStudent(s.studentId, 'tuition')}
            className="font-bold text-slate-900 hover:underline text-left"
          >
            {s.studentName}
          </button>
        ),
      },
      {
        key: 'parentInfo',
        header: '학부모 / 연락처',
        render: (s) => (
          <div>
            <span className="font-medium text-slate-700 block">{s.parentName}</span>
            <span className="text-[11px] text-slate-400">{formatPhone(s.parentPhone)}</span>
          </div>
        ),
      },
      {
        key: 'tuitionUnpaid',
        header: '수강료 미납',
        align: 'right',
        className: 'font-semibold text-slate-900 tabular-nums',
        render: (s) => formatCurrency(s.tuitionUnpaid),
      },
      {
        key: 'textbookUnpaid',
        header: '교재비 미납',
        align: 'right',
        className: 'font-semibold text-amber-700 tabular-nums',
        render: (s) => (s.textbookUnpaid > 0 ? formatCurrency(s.textbookUnpaid) : '-'),
      },
      {
        key: 'totalUnpaid',
        header: '합계',
        align: 'right',
        className: 'font-black text-rose-600 tabular-nums',
        render: (s) => formatCurrency(s.totalUnpaid),
      },
      {
        key: 'overdue',
        header: '연체',
        align: 'center',
        render: (s) =>
          s.overdueCount > 0 ? (
            <StatusBadge status="danger" size="sm" dot>
              {s.overdueCount}건 · {s.oldestOverdueDays}일
            </StatusBadge>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
      {
        key: 'actions',
        header: '액션',
        align: 'right',
        render: (s) => (
          <div className="flex items-center justify-end gap-1.5">
            {s.parentPhone && (
              <a
                href={`tel:${s.parentPhone}`}
                className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="전화 연결"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => openPayment(s.studentId)}
            >
              통합 수납
            </Button>
          </div>
        ),
      },
    ],
    [customerLabel, openStudent]
  );

  const renderMobileCard = (s: StudentUnpaidSummary) => (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openStudent(s.studentId, 'tuition')}
              className="font-bold text-slate-900 hover:underline text-sm"
            >
              {s.studentName}
            </button>
            {s.overdueCount > 0 && (
              <StatusBadge status="danger" size="sm" dot>
                연체 {s.overdueCount}건 · {s.oldestOverdueDays}일
              </StatusBadge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {s.parentName} · {formatPhone(s.parentPhone)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right min-w-[140px]">
            <p className="text-base sm:text-lg font-black text-rose-600 tabular-nums">
              {formatCurrency(s.totalUnpaid)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              수강료 {formatCurrency(s.tuitionUnpaid)} + 교재 {formatCurrency(s.textbookUnpaid)}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openPayment(s.studentId)}
          >
            통합 수납
          </Button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {s.tuitionItems.length > 0 && (
          <div className="space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-600" /> 수강료
            </p>
            {s.tuitionItems.map((inv) => (
              <div key={inv.id} className="flex justify-between text-slate-600 pl-5">
                <span>{inv.yearMonth} (기한 {inv.dueDate.slice(5)})</span>
                <span className="font-bold text-rose-600">{formatCurrency(inv.unpaidAmount)}</span>
              </div>
            ))}
          </div>
        )}
        {s.textbookItems.length > 0 && (
          <div className="space-y-1">
            <p className="font-bold text-amber-700 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> 교재비
            </p>
            {s.textbookItems.map((sale) => (
              <div key={sale.id} className="flex justify-between text-slate-600 pl-5">
                <span>{sale.textbookTitle}</span>
                <span className="font-bold text-rose-600">{formatCurrency(sale.unpaidAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {s.parentPhone && (
        <a
          href={`tel:${s.parentPhone}`}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-700 font-semibold hover:underline"
        >
          <Phone className="w-3 h-3" /> 전화 연결
        </a>
      )}
    </div>
  );

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {!embedded && (
        <PageHeader
          density="compact"
          icon={<AlertCircle className="w-5 h-5 text-slate-700" />}
          title="미납 통합 관리"
          description="수강료 및 교재비 미납 내역을 합산하여 한 번에 수납 처리합니다."
        />
      )}

      {/* KPI 카드 (4열 1행 그리드 통일) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryMetricCard
          label={`미납 ${customerLabel}`}
          value={`${stats.studentCount}명`}
          subtitle={stats.studentCount > 0 ? '납부 안내 필요' : '모두 완납'}
          variant={stats.studentCount > 0 ? 'rose' : 'default'}
        />
        <SummaryMetricCard
          label="총 미납액"
          value={formatCurrency(stats.grandTotal)}
          variant={stats.grandTotal > 0 ? 'rose' : 'default'}
          subtitle={`수강료 ${formatCurrency(stats.tuitionTotal)}`}
        />
        <SummaryMetricCard
          label="교재비 미납"
          value={formatCurrency(stats.textbookTotal)}
          subtitle="교재·교구 포함"
        />
        <SummaryMetricCard
          label="연체 건수"
          value={`${stats.overdueInvoices}건`}
          variant={stats.overdueInvoices > 0 ? 'rose' : 'default'}
          subtitle={stats.overdueStudents > 0 ? `${stats.overdueStudents}명 연체` : '연체 없음'}
        />
      </div>

      {/* 필터 툴바 */}
      <FilterBar>
        <FilterTabs
          tabs={filterTabs}
          active={filterMode}
          activeClassName="bg-slate-900 text-white shadow-xs"
          onChange={(tabId) => setFilterMode(tabId as UnpaidFilter)}
        />
        <div className="w-full sm:w-64">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`${customerLabel}명 또는 학부모 연락처`}
          />
        </div>
      </FilterBar>

      {/* 데이터 테이블 */}
      <StandardDataTable
        data={filtered}
        columns={columns}
        keyExtractor={(s) => s.studentId}
        emptyTitle="미납 내역이 없습니다."
        emptyDescription={
          searchQuery
            ? `검색어와 일치하는 미납 ${customerLabel}이(가) 없습니다.`
            : `현재 모든 ${customerLabel}이(가) 정상 완납 상태입니다.`
        }
        renderMobileCard={renderMobileCard}
      />

      {payStudent && (
        <CombinedPaymentModal
          student={payStudent}
          onSuccess={() => setPayStudent(null)}
          onClose={() => setPayStudent(null)}
        />
      )}
    </div>
  );
};
