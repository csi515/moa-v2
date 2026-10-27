import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Share2,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertOctagon,
  Building,
  User,
  Phone,
  Mail,
  ShieldAlert,
  ChevronRight,
  Download,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { ListLoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ActionableEmptyState } from '@/components/common/ActionableEmptyState';
import { commitOptimistic } from '@/core/feedback/optimisticStatus';
import { celebrateSuccess, pulseError } from '@/core/feedback/sensoryFeedback';
import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import {
  transitionInvoiceStatus,
  filterMonthlyFees,
  summarizeOpenFees,
  type CounterFeeFilter,
  generateInvoiceShareText,
  generateHometaxTaxInvoiceCsv,
  calculateAccountsReceivableAging,
  type InvoiceRecord,
  type InvoiceStatus,
  type TaxInvoice,
  type UnpaidRecord,
  type AgingRiskLevel,
} from '../domain/billingInvoicingEngine';

const STORAGE_KEY_INVOICES = 'moa_billing_invoices';

export interface BillingInvoicingViewProps {
  title?: string;
  subtitle?: string;
  orgName?: string;
}

const DEFAULT_INVOICES: InvoiceRecord[] = [
  {
    id: 'inv-001',
    memberId: 'cust-101',
    memberName: '(주)알파인더스트리',
    amount: 3500000,
    billingYearMonth: '2026-10',
    dueDate: '2026-10-15',
    status: 'PAID',
    paidAt: '2026-10-14T09:30:00Z',
  },
  {
    id: 'inv-002',
    memberId: 'cust-102',
    memberName: '베타솔루션즈',
    amount: 1800000,
    billingYearMonth: '2026-10',
    dueDate: '2026-10-20',
    status: 'PENDING',
  },
  {
    id: 'inv-003',
    memberId: 'cust-103',
    memberName: '감마제조(주)',
    amount: 4200000,
    billingYearMonth: '2026-09',
    dueDate: '2026-09-25',
    status: 'OVERDUE',
  },
  {
    id: 'inv-004',
    memberId: 'cust-104',
    memberName: '델타물류',
    amount: 5500000,
    billingYearMonth: '2026-08',
    dueDate: '2026-08-15',
    status: 'OVERDUE',
  },
  {
    id: 'inv-005',
    memberId: 'cust-105',
    memberName: '에코에너지(주)',
    amount: 9800000,
    billingYearMonth: '2026-06',
    dueDate: '2026-06-30',
    status: 'OVERDUE',
  },
];

function MonthlyFeeQuickBar({
  invoices,
  filter,
  onFilter,
  onPayFirstOpen,
}: {
  invoices: InvoiceRecord[];
  filter: CounterFeeFilter;
  onFilter: (next: CounterFeeFilter) => void;
  onPayFirstOpen: () => void;
}) {
  const summary = summarizeOpenFees(invoices);
  const tabs: { id: CounterFeeFilter; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'open', label: `미납/연체만 보기 (${summary.people}명)` },
    { id: 'paid', label: '완납' },
  ];
  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">
        미납 {summary.people}명 · 미수금 {summary.amount.toLocaleString('ko-KR')}원
      </p>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`min-h-12 rounded-xl px-3 text-sm font-bold ${filter === tab.id ? 'bg-slate-900 text-white' : 'bg-white'}`}
            onClick={() => onFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button type="button" className="min-h-12 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white" onClick={onPayFirstOpen}>
          수납 완료 처리
        </button>
      </div>
    </section>
  );
}

export const BillingInvoicingView: React.FC<BillingInvoicingViewProps> = ({
  title = '정기 청구 & 미수금 에이징 원장',
  subtitle = '홈택스 세금계산서 일괄발행 및 거래처 미수금 연체 리스크 관제',
  orgName = '모아 엔터프라이즈',
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'aging'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feeFilter, setFeeFilter] = useState<CounterFeeFilter>('all');
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

  const storageKey = getTenantStorageKey(STORAGE_KEY_INVOICES);

  // 1. Refine v5 데이터 페칭 우선
  const { query } = useList<any>({
    resource: 'billing_invoices',
    pagination: { mode: 'off' },
  });

  const refineRows = query?.data?.data as InvoiceRecord[] | undefined;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  // 2. 로컬스토리지 폴백 상태
  const [statusOverlay, setStatusOverlay] = useState<Record<string, InvoiceRecord>>({});
  const [localInvoices, setLocalInvoices] = useState<InvoiceRecord[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // 무시
    }
    return DEFAULT_INVOICES;
  });

  const invoices = useMemo(() => {
    const base = refineRows && refineRows.length > 0 ? refineRows : localInvoices;
    return base.map((invoice) => statusOverlay[invoice.id] ?? invoice);
  }, [refineRows, localInvoices, statusOverlay]);

  const saveLocalInvoices = (next: InvoiceRecord[]) => {
    setLocalInvoices(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // 무시
    }
  };

  // 미수금(미납) 목록 추출
  const unpaidRecords: UnpaidRecord[] = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE')
      .map((inv) => ({
        id: inv.id,
        memberOrCompanyId: inv.memberId,
        memberOrCompanyName: inv.memberName,
        dueDate: inv.dueDate,
        amount: inv.amount,
        invoiceNumber: `INV-${inv.billingYearMonth.replace('-', '')}-${inv.id.slice(-3)}`,
      }));
  }, [invoices]);

  // 미수금 에이징 분석 계산
  const agingSummary = useMemo(() => {
    return calculateAccountsReceivableAging(unpaidRecords);
  }, [unpaidRecords]);

  // 필터링된 청구서 목록
  const filteredInvoices = useMemo(() => {
    let result = filterMonthlyFees(invoices, feeFilter);
    if (statusFilter !== 'ALL') {
      result = result.filter((inv) => inv.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.memberName.toLowerCase().includes(term) ||
          inv.billingYearMonth.includes(term) ||
          inv.id.toLowerCase().includes(term)
      );
    }
    return result;
  }, [invoices, statusFilter, searchTerm, feeFilter]);

  // 수납 처리 (PAY)
  const handlePay = (invoice: InvoiceRecord) => {
    const res = transitionInvoiceStatus(invoice, 'PAY');
    if (!res.success) {
      pulseError();
      showToast(res.error || '수납 처리에 실패했습니다.', 'warning');
      return;
    }
    const next = invoices.map((inv) => (inv.id === invoice.id ? res.updatedInvoice : inv));
    void commitOptimistic({
      apply: () => {
        setStatusOverlay((current) => ({ ...current, [invoice.id]: res.updatedInvoice }));
        if (!refineRows || refineRows.length === 0) saveLocalInvoices(next);
      },
      rollback: () => {
        setStatusOverlay((current) => {
          const copy = { ...current };
          delete copy[invoice.id];
          return copy;
        });
        if (!refineRows || refineRows.length === 0) saveLocalInvoices(invoices);
      },
      persist: () =>
        new Promise<void>((resolve, reject) => {
          if (!refineRows || refineRows.length === 0) {
            resolve();
            return;
          }
          mutateUpdate(
            {
              resource: 'billing_invoices',
              id: invoice.id,
              values: { status: 'PAID', paid_at: res.updatedInvoice.paidAt },
            },
            {
              onSuccess: () => {
                refetch();
                resolve();
              },
              onError: () => reject(new Error('수납 저장에 실패했습니다.')),
            }
          );
        }),
      onSuccess: () => {
        celebrateSuccess();
        showToast(`[${invoice.memberName}] 수납 완료 처리되었습니다.`, 'success');
      },
      onError: (message) => {
        pulseError();
        showToast(message, 'error');
      },
    });
  };

  // 청구 안내 텍스트 복사/공유 (Web Share API)
  const handleShare = async (invoice: InvoiceRecord) => {
    const payload = {
      orgName,
      memberName: invoice.memberName,
      billingYearMonth: invoice.billingYearMonth,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      bankName: '기업은행',
      accountNumber: '025-100234-01-098',
      accountHolder: orgName,
    };

    const shareData = generateInvoiceShareText(payload);

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
        });
        showToast('청구서 안내가 공유되었습니다.', 'success');
        return;
      } catch {
        // 브라우저 취소 등 -> 클립보드로 폴백
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
      showToast('청구 안내문이 클립보드에 복사되었습니다.', 'success');
    } catch {
      showToast('클립보드 복사 권한이 없습니다.', 'warning');
    }
  };

  // 국세청 홈택스 전자세금계산서 일괄작성 CSV 원클릭 다운로드
  const handleDownloadHometaxCsv = () => {
    if (invoices.length === 0) {
      showToast('발행할 청구 내역이 없습니다.', 'warning');
      return;
    }

    const taxInvoices: TaxInvoice[] = invoices.map((inv) => {
      // 공급가액 10% 부가세 역산 (또는 과세 산정)
      const supplyAmount = Math.round(inv.amount / 1.1);
      const taxAmount = inv.amount - supplyAmount;

      return {
        invoiceType: '01',
        writeDate: new Date().toISOString().slice(0, 10),
        supplier: {
          businessNumber: '123-45-67890',
          companyName: orgName,
          representativeName: '대표자',
          address: '서울특별시 강남구 테헤란로 123',
          businessType: '서비스',
          businessItem: '경영자문 및 교육',
          email: 'tax@moa-platform.com',
        },
        buyer: {
          buyerType: 'BUSINESS',
          registrationNumber: '220-81-62517',
          companyName: inv.memberName,
          representativeName: '대표',
          email1: 'finance@client.com',
        },
        items: [
          {
            day: new Date().toISOString().slice(8, 10),
            itemName: `${inv.billingYearMonth} 정기 정산 및 용역 대금`,
            supplyAmount,
            taxAmount,
          },
        ],
        claimType: inv.status === 'PAID' ? 'RECEIPT' : 'CLAIM',
      };
    });

    const csvString = generateHometaxTaxInvoiceCsv(taxInvoices);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hometax_tax_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('국세청 홈택스 일괄작성 CSV가 다운로드되었습니다.', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      <MonthlyFeeQuickBar
        invoices={invoices}
        filter={feeFilter}
        onFilter={setFeeFilter}
        onPayFirstOpen={() => {
          const first = filterMonthlyFees(invoices, 'open')[0];
          if (first) handlePay(first);
        }}
      />
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>엔터프라이즈 세무 & 미수금 채권 관리</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 홈택스 CSV 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleDownloadHometaxCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>홈택스 세금계산서 CSV</span>
          </button>

          {/* 신규 청구서 발행 버튼 */}
          <button
            type="button"
            onClick={() => setIsNewInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>신규 청구 발행</span>
          </button>
        </div>
      </div>

      {/* 미수금 에이징(Aging) 4구간 위젯 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 정상 (30일 이내) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>정상 (30일 이내)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {agingSummary.bucketTotals.current.toLocaleString('ko-KR')}원
          </div>
          <p className="text-[11px] text-slate-400">
            {agingSummary.bucketCounts.current}건 청구 진행 중
          </p>
        </div>

        {/* 주의 (31~60일) */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>주의 (31~60일 연체)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-amber-950">
            {agingSummary.bucketTotals.days31To60.toLocaleString('ko-KR')}원
          </div>
          <p className="text-[11px] text-amber-600 font-medium">
            {agingSummary.bucketCounts.days31To60}건 | 1차 납부 독촉 권고
          </p>
        </div>

        {/* 경고 (61~90일) */}
        <div className="p-4 rounded-2xl bg-white border border-orange-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-orange-700 font-semibold">
            <span>경고 (61~90일 연체)</span>
            <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-orange-950">
            {agingSummary.bucketTotals.days61To90.toLocaleString('ko-KR')}원
          </div>
          <p className="text-[11px] text-orange-600 font-medium">
            {agingSummary.bucketCounts.days61To90}건 | 공급 정지 및 내용증명
          </p>
        </div>

        {/* 위험 (90일 초과) */}
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-300 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>위험 (90일 초과 대손 위험)</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-rose-950">
            {agingSummary.bucketTotals.over90.toLocaleString('ko-KR')}원
          </div>
          <p className="text-[11px] text-rose-600 font-bold">
            {agingSummary.bucketCounts.over90}건 | 대손충당금 및 법적 절차
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'invoices'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>전체 청구 및 수납 원장 ({invoices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aging')}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === 'aging'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>거래처별 미수금 에이징 분석 ({agingSummary.memberAgingList.length})</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 청구 및 수납 원장 */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* 검색 및 필터 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="거래처명, 청구년월 검색"
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="납부 상태 필터"
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 상태</option>
                <option value="PENDING">대기 중 (PENDING)</option>
                <option value="PAID">수납 완료 (PAID)</option>
                <option value="OVERDUE">연체 (OVERDUE)</option>
                <option value="WAIVED">면제 (WAIVED)</option>
              </select>
            </div>
          </div>

          {/* 테이블 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">청구번호</th>
                    <th className="px-4 py-3">거래처 / 회원명</th>
                    <th className="px-4 py-3">청구년월</th>
                    <th className="px-4 py-3">청구 금액</th>
                    <th className="px-4 py-3">납부 기한</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-right">실무 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {query.isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4">
                        <ListLoadingSkeleton />
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <ActionableEmptyState
                          iconName="check"
                          title="미납된 청구서가 없습니다. 모든 수납이 완료되었습니다."
                          description="새 청구가 생기면 이 목록에 바로 나타납니다."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">
                          {inv.id}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {inv.memberName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {inv.billingYearMonth}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {inv.amount.toLocaleString('ko-KR')}원
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono">
                          {inv.dueDate}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700'
                                : inv.status === 'WAIVED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {inv.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                            {inv.status === 'OVERDUE' && <AlertTriangle className="w-3 h-3" />}
                            {inv.status === 'PENDING' && <Clock className="w-3 h-3" />}
                            <span>{inv.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {inv.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handlePay(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                            >
                              수납 확인
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleShare(inv)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>안내 복사</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: 거래처별 미수금 에이징 분석 */}
      {activeTab === 'aging' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  거래처별 연체 기간 및 리스크 등급 분류 (총 미수 채권:{' '}
                  <span className="text-rose-600 font-extrabold">
                    {agingSummary.totalUnpaidAmount.toLocaleString('ko-KR')}원
                  </span>
                  )
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  기준일: {agingSummary.referenceDate} | 고위험 채권(61일 이상):{' '}
                  <span className="font-bold text-rose-600">
                    {agingSummary.highRiskTotal.toLocaleString('ko-KR')}원
                  </span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">거래처명</th>
                    <th className="px-4 py-3">리스크 등급</th>
                    <th className="px-4 py-3">총 미수금</th>
                    <th className="px-4 py-3">30일 이내</th>
                    <th className="px-4 py-3">31~60일</th>
                    <th className="px-4 py-3">61~90일</th>
                    <th className="px-4 py-3">90일 초과</th>
                    <th className="px-4 py-3">최대 연체일</th>
                    <th className="px-4 py-3 text-right">조치 권고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agingSummary.memberAgingList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        현재 미수금이 발생한 거래처가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    agingSummary.memberAgingList.map((m) => {
                      const badgeMap: Record<AgingRiskLevel, { bg: string; text: string; label: string }> = {
                        CRITICAL: { bg: 'bg-rose-100', text: 'text-rose-800', label: '위험 (90일+)' },
                        WARNING: { bg: 'bg-orange-100', text: 'text-orange-800', label: '경고 (61-90일)' },
                        WATCH: { bg: 'bg-amber-100', text: 'text-amber-800', label: '주의 (31-60일)' },
                        NORMAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: '정상 (30일 이내)' },
                      };

                      const badge = badgeMap[m.riskLevel];

                      return (
                        <tr key={m.memberOrCompanyId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {m.memberOrCompanyName}
                            <span className="text-[11px] text-slate-400 font-normal ml-1">
                              ({m.unpaidCount}건)
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900">
                            {m.totalUnpaidAmount.toLocaleString('ko-KR')}원
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {m.currentAmount > 0 ? `${m.currentAmount.toLocaleString('ko-KR')}원` : '-'}
                          </td>
                          <td className="px-4 py-3 text-amber-700 font-medium">
                            {m.days31To60Amount > 0 ? `${m.days31To60Amount.toLocaleString('ko-KR')}원` : '-'}
                          </td>
                          <td className="px-4 py-3 text-orange-700 font-semibold">
                            {m.days61To90Amount > 0 ? `${m.days61To90Amount.toLocaleString('ko-KR')}원` : '-'}
                          </td>
                          <td className="px-4 py-3 text-rose-700 font-bold">
                            {m.over90Amount > 0 ? `${m.over90Amount.toLocaleString('ko-KR')}원` : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {m.maxOverdueDays}일 연체
                          </td>
                          <td className="px-4 py-3 text-right">
                            {m.riskLevel === 'CRITICAL' && (
                              <span className="text-[11px] font-bold text-rose-600">
                                법적 조치 착수
                              </span>
                            )}
                            {m.riskLevel === 'WARNING' && (
                              <span className="text-[11px] font-bold text-orange-600">
                                공급 정지 안내
                              </span>
                            )}
                            {m.riskLevel === 'WATCH' && (
                              <span className="text-[11px] font-bold text-amber-600">
                                1차 독촉장 발송
                              </span>
                            )}
                            {m.riskLevel === 'NORMAL' && (
                              <span className="text-[11px] text-slate-400">정상 추이</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 신규 청구서 발행 모달 */}
      {isNewInvoiceModalOpen && (
        <NewInvoiceModal
          onClose={() => setIsNewInvoiceModalOpen(false)}
          onCreated={(newInv) => {
            if (refineRows) {
              mutateCreate(
                {
                  resource: 'billing_invoices',
                  values: {
                    member_id: newInv.memberId,
                    member_name: newInv.memberName,
                    amount: newInv.amount,
                    billing_year_month: newInv.billingYearMonth,
                    due_date: newInv.dueDate,
                    status: 'PENDING',
                  },
                },
                {
                  onSuccess: () => {
                    refetch();
                    setIsNewInvoiceModalOpen(false);
                    showToast(`[${newInv.memberName}] 청구서가 발행되었습니다.`, 'success');
                  },
                  onError: () => {
                    saveLocalInvoices([newInv, ...invoices]);
                    setIsNewInvoiceModalOpen(false);
                    showToast(`[${newInv.memberName}] 청구서가 로컬 발행되었습니다.`, 'info');
                  },
                }
              );
            } else {
              saveLocalInvoices([newInv, ...invoices]);
              setIsNewInvoiceModalOpen(false);
              showToast(`[${newInv.memberName}] 청구서가 발행되었습니다.`, 'success');
            }
          }}
        />
      )}
    </div>
  );
};

interface NewInvoiceModalProps {
  onClose: () => void;
  onCreated: (inv: InvoiceRecord) => void;
}

const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ onClose, onCreated }) => {
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('2000000');
  const [billingYearMonth, setBillingYearMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      showToast('거래처명을 입력해주세요.', 'warning');
      return;
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      showToast('올바른 청구 금액을 입력해주세요.', 'warning');
      return;
    }

    const newInv: InvoiceRecord = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      memberId: `cust-${Date.now().toString().slice(-3)}`,
      memberName: memberName.trim(),
      amount: numAmount,
      billingYearMonth,
      dueDate,
      status: 'PENDING',
    };

    onCreated(newInv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">신규 정기 청구서 발행</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              거래처 / 고객명
            </label>
            <input
              type="text"
              required
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="예: (주)알파인더스트리"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              청구 금액 (원)
            </label>
            <input
              type="number"
              required
              step="10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                청구년월
              </label>
              <input
                type="month"
                required
                value={billingYearMonth}
                onChange={(e) => setBillingYearMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                납부 기한
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              청구서 발행하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
