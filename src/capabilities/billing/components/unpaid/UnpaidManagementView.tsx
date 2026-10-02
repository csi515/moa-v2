import React, { useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { useStorageRefresh, useStudentNavigation } from '@/hooks';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { StudentService } from '@/core/students';
import type { Student } from '@/types';
import {
  EmptyState,
  FilterBar,
  FilterTabs,
  PageHeader,
  SearchField,
  SummaryMetricCard,
  type FilterTabItem,
} from '@/shared/components';
import { formatCurrency, formatPhone } from '@/utils/formatters';
import { CombinedPaymentModal } from '../tuition/CombinedPaymentModal';
import {
  AlertCircle,
  CreditCard,
  BookOpen,
  Download,
  Phone,
} from 'lucide-react';

type UnpaidFilter = 'all' | 'overdue';

const FILTER_TABS: FilterTabItem<UnpaidFilter>[] = [
  { id: 'all', label: '전체 미납' },
  { id: 'overdue', label: '연체' },
];

export const UnpaidManagementView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { showToast } = useApp();
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

  const handleExportCsv = () => {
    const header = `${customerLabel}명,학부모,연락처,수강료미납,교재비미납,합계,연체건수\n`;
    const rows = filtered
      .map(
        (s) =>
          `${s.studentName},${s.parentName},${s.parentPhone},${s.tuitionUnpaid},${s.textbookUnpaid},${s.totalUnpaid},${s.overdueCount}`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `미납명단_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('미납 명단 CSV가 다운로드되었습니다.', 'success');
  };

  const openPayment = (studentId: string) => {
    const st = StudentService.getStudentById(studentId);
    if (st) setPayStudent(st);
  };

  return (
    <div className={embedded ? 'space-y-4 pb-2' : 'space-y-4 pb-4'}>
      {embedded ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <SummaryMetricCard label={`미납 ${customerLabel}`} value={`${stats.studentCount}명`} />
            <SummaryMetricCard
              label="총 미납액"
              value={formatCurrency(stats.grandTotal)}
              variant="rose"
            />
            <SummaryMetricCard
              label="수강료 미납"
              value={formatCurrency(stats.tuitionTotal)}
              variant="indigo"
            />
            <SummaryMetricCard
              label="교재비 미납"
              value={formatCurrency(stats.textbookTotal)}
              variant="amber"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 self-start"
            >
              <Download className="w-4 h-4" />
              CSV 내보내기
            </button>
          </div>
        </>
      ) : (
        <PageHeader
          icon={<AlertCircle className="w-6 h-6" />}
          iconClassName="text-rose-600"
          title="미납 통합 관리"
          description={`수강료·교재비 미납을 ${customerLabel}별로 한눈에 확인하고 수납 처리합니다`}
          actions={
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 self-start"
            >
              <Download className="w-4 h-4" />
              CSV 내보내기
            </button>
          }
        />
      )}

      {!embedded && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryMetricCard label={`미납 ${customerLabel}`} value={`${stats.studentCount}명`} />
        <SummaryMetricCard label="총 미납액" value={formatCurrency(stats.grandTotal)} variant="rose" />
        <SummaryMetricCard label="수강료 미납" value={formatCurrency(stats.tuitionTotal)} variant="indigo" />
        <SummaryMetricCard label="교재비 미납" value={formatCurrency(stats.textbookTotal)} variant="amber" />
      </div>
      )}

      <FilterBar>
        <FilterTabs tabs={filterTabs} active={filterMode} onChange={(id) => setFilterMode(id as UnpaidFilter)} />
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`${customerLabel}명, 학부모, 연락처 검색...`}
          className="flex-1 min-w-[200px]"
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={<span className="text-3xl">🎉</span>} title="미납 내역이 없습니다!" />
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">{customerLabel}명</th>
                    <th className="py-3.5 px-4">학부모 / 연락처</th>
                    <th className="py-3.5 px-4 text-right">수강료 미납</th>
                    <th className="py-3.5 px-4 text-right">교재비 미납</th>
                    <th className="py-3.5 px-4 text-right">합계</th>
                    <th className="py-3.5 px-4 text-center">연체</th>
                    <th className="py-3.5 px-4 text-right">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.studentId} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => openStudent(s.studentId, 'tuition')}
                          className="font-bold text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {s.studentName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 block">{s.parentName}</span>
                        <span className="text-[11px] text-slate-400">{formatPhone(s.parentPhone)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-indigo-700">
                        {formatCurrency(s.tuitionUnpaid)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-amber-700">
                        {formatCurrency(s.textbookUnpaid)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        {formatCurrency(s.totalUnpaid)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.overdueCount > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                            {s.overdueCount}건 · {s.oldestOverdueDays}일
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.parentPhone && (
                            <a
                              href={`tel:${s.parentPhone}`}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                              title="전화 연결"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => openPayment(s.studentId)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                          >
                            통합 수납
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
          {filtered.map((s) => (
            <div
              key={s.studentId}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openStudent(s.studentId, 'tuition')}
                      className="font-bold text-slate-900 hover:text-indigo-600 text-sm"
                    >
                      {s.studentName}
                    </button>
                    {s.overdueCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                        연체 {s.overdueCount}건 · {s.oldestOverdueDays}일
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.parentName} · {formatPhone(s.parentPhone)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-black text-rose-600">{formatCurrency(s.totalUnpaid)}</p>
                    <p className="text-[11px] text-slate-400">
                      수강료 {formatCurrency(s.tuitionUnpaid)} + 교재 {formatCurrency(s.textbookUnpaid)}
                    </p>
                  </div>
                  <button
                    onClick={() => openPayment(s.studentId)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    통합 수납
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {s.tuitionItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-bold text-indigo-700 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> 수강료
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
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:underline"
                >
                  <Phone className="w-3 h-3" /> 전화 연결
                </a>
              )}
            </div>
          ))}
          </div>
        </>
      )}

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
