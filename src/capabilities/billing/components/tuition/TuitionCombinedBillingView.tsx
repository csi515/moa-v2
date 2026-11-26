import React, { useMemo, useState } from 'react';
import type { Student } from '@/types/customer';
import {
  countMonthlyTuitionWorkStatuses,
  filterMonthlyTuitionWorkStudents,
  TuitionService,
  type MonthlyTuitionWorkFilter,
} from '@/capabilities/billing/finance';
import { formatCurrency } from '@/utils/formatters';
import { FilterBar, FilterTabs, StandardDataTable, type StandardColumn, StatusBadge, Button } from '@/shared/components';
import { COMBINED_BILLING_STATUS_FILTER_LABELS } from './tuitionViewTypes';

interface TuitionCombinedBillingViewProps {
  hideFilterBar?: boolean;
  customerLabel: string;
  students: Student[];
  selectedMonth: string;
  searchQuery: string;
  onSelectStudent: (studentId: string) => void;
  onCombinedPay: (student: Student) => void;
  statusFilter?: MonthlyTuitionWorkFilter;
  onStatusFilterChange?: (status: MonthlyTuitionWorkFilter) => void;
}

const WORK_STATUS_FILTER_ORDER: MonthlyTuitionWorkFilter[] = [
  'all',
  'paid',
  'unpaid',
  'no_invoice',
];

export const TuitionCombinedBillingView: React.FC<TuitionCombinedBillingViewProps> = ({
  customerLabel,
  students,
  selectedMonth,
  searchQuery,
  onSelectStudent,
  onCombinedPay,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
}) => {
  const [internalStatusFilter, setInternalStatusFilter] =
    useState<MonthlyTuitionWorkFilter>('all');
  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const setStatusFilter = onStatusFilterChange ?? setInternalStatusFilter;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const invoices = TuitionService.getInvoices();

  const statusCounts = useMemo(() => {
    return countMonthlyTuitionWorkStatuses(students, invoices, selectedMonth);
  }, [students, invoices, selectedMonth]);

  const filteredStudents = useMemo(() => {
    return filterMonthlyTuitionWorkStudents(students, invoices, selectedMonth, {
      searchQuery,
      statusFilter,
    });
  }, [students, invoices, selectedMonth, searchQuery, statusFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const columns: StandardColumn<Student>[] = useMemo(
    () => [
      {
        key: 'studentName',
        header: `${customerLabel}명 / 학부모`,
        render: (student) => (
          <div>
            <button
              type="button"
              onClick={() => onSelectStudent(student.id)}
              className="font-bold text-slate-900 hover:underline text-left block"
            >
              {student.name}
            </button>
            <span className="text-[11px] text-slate-400">
              {student.parentName} ({student.parentPhone})
            </span>
          </div>
        ),
      },
      {
        key: 'tuitionFee',
        header: '수강료 (청구/미납)',
        align: 'right',
        className: 'tabular-nums',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          return (
            <div>
              <p className="font-bold text-slate-900">{formatCurrency(summary.tuitionBilled || 0)}</p>
              {summary.tuitionUnpaid > 0 ? (
                <p className="text-[11px] font-bold text-rose-600">미납: {formatCurrency(summary.tuitionUnpaid)}</p>
              ) : (
                <p className="text-[11px] text-emerald-600 font-semibold">전액 완납</p>
              )}
            </div>
          );
        },
      },
      {
        key: 'textbookFee',
        header: '교재비 (구매/미납)',
        align: 'right',
        className: 'tabular-nums',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          return (
            <div>
              <p className="font-bold text-slate-900">
                {(summary.textbookBilled || 0) > 0 ? formatCurrency(summary.textbookBilled || 0) : '-'}
              </p>
              {summary.textbookUnpaid > 0 ? (
                <p className="text-[11px] font-bold text-rose-600">미납: {formatCurrency(summary.textbookUnpaid)}</p>
              ) : (summary.textbookBilled || 0) > 0 ? (
                <p className="text-[11px] text-emerald-600 font-semibold">전액 완납</p>
              ) : (
                <p className="text-[11px] text-slate-400">-</p>
              )}
            </div>
          );
        },
      },
      {
        key: 'totalBilled',
        header: '합산 총 청구액',
        align: 'right',
        className: 'font-extrabold text-slate-900 tabular-nums',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          return formatCurrency(summary.totalBilled || 0);
        },
      },
      {
        key: 'totalUnpaid',
        header: '합산 총 미납액',
        align: 'right',
        className: 'font-extrabold tabular-nums',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          return (summary.totalUnpaid || 0) > 0 ? (
            <span className="text-rose-600 font-bold">{formatCurrency(summary.totalUnpaid)}</span>
          ) : (
            <span className="text-slate-400 font-normal">₩0</span>
          );
        },
      },
      {
        key: 'status',
        header: '수납 상태',
        align: 'center',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          const totalUnpaid = summary.totalUnpaid || 0;
          const totalPaid = summary.totalPaid || 0;
          if (totalUnpaid === 0) return <StatusBadge semantic="완납" dot />;
          if (totalPaid > 0) return <StatusBadge semantic="일부미납" dot />;
          return <StatusBadge semantic="전액미납" dot />;
        },
      },
      {
        key: 'actions',
        header: '액션',
        align: 'right',
        render: (student) => {
          const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
          const hasUnpaid = (summary.totalUnpaid || 0) > 0;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {hasUnpaid && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCombinedPay(student)}
                >
                  통합 수납
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectStudent(student.id)}
              >
                상세보기
              </Button>
            </div>
          );
        },
      },
    ],
    [customerLabel, onSelectStudent, onCombinedPay, selectedMonth]
  );

  const renderMobileCard = (student: Student) => {
    const summary = TuitionService.getStudentBillingSummary(student.id, selectedMonth);
    const hasUnpaid = (summary.totalUnpaid || 0) > 0;
    const totalUnpaid = summary.totalUnpaid || 0;
    const totalPaid = summary.totalPaid || 0;

    return (
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => onSelectStudent(student.id)}
              className="font-bold text-slate-900 hover:underline text-sm text-left"
            >
              {student.name}
            </button>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {student.parentName} ({student.parentPhone})
            </p>
          </div>
          {totalUnpaid === 0 ? (
            <StatusBadge semantic="완납" dot />
          ) : totalPaid > 0 ? (
            <StatusBadge semantic="일부미납" dot />
          ) : (
            <StatusBadge semantic="전액미납" dot />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-slate-500 font-semibold mb-0.5">수강료</p>
            <p className="font-bold text-slate-900">{formatCurrency(summary.tuitionBilled || 0)}</p>
            {summary.tuitionUnpaid > 0 && (
              <p className="text-[11px] font-bold text-rose-600">미납 {formatCurrency(summary.tuitionUnpaid)}</p>
            )}
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-slate-500 font-semibold mb-0.5">교재비</p>
            <p className="font-bold text-slate-900">{formatCurrency(summary.textbookBilled || 0)}</p>
            {summary.textbookUnpaid > 0 && (
              <p className="text-[11px] font-bold text-rose-600">미납 {formatCurrency(summary.textbookUnpaid)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="tabular-nums">
            <span className="text-slate-500">합산 미납: </span>
            <span className="font-black text-rose-600">
              {summary.totalUnpaid > 0 ? formatCurrency(summary.totalUnpaid) : '₩0'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasUnpaid && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCombinedPay(student)}
              >
                통합 수납
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectStudent(student.id)}
            >
              상세
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 상태 필터 탭 */}
      <FilterBar>
        <FilterTabs
          tabs={WORK_STATUS_FILTER_ORDER.map((statusKey) => ({
            id: statusKey,
            label: COMBINED_BILLING_STATUS_FILTER_LABELS[statusKey],
            count: statusCounts[statusKey],
          }))}
          active={statusFilter}
          activeClassName="bg-slate-900 text-white shadow-xs"
          onChange={(tabId) => {
            setStatusFilter(tabId as MonthlyTuitionWorkFilter);
            setCurrentPage(1);
          }}
        />
      </FilterBar>

      <StandardDataTable
        data={paginatedStudents}
        columns={columns}
        keyExtractor={(student) => student.id}
        emptyTitle={
          statusFilter === 'unpaid'
            ? `이번 달 미납 ${customerLabel}이(가) 없습니다. (모두 완납)`
            : `해당 조건에 맞는 ${customerLabel}이(가) 없습니다.`
        }
        emptyDescription="상태 탭이나 검색어를 변경해 보세요."
        renderMobileCard={renderMobileCard}
        pagination={{
          currentPage,
          totalItems: filteredStudents.length,
          pageSize,
          pageSizeOptions: [10, 20, 50],
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
      />
    </div>
  );
};
