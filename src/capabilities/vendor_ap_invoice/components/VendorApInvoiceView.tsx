import { showToast } from '@/shared/feedback/uiFeedback';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { formatNumberWithCommas } from '@/utils/formatters';
import React, { useState } from 'react';
import {
  Vendor,
  PurchaseInvoice,
  calculatePurchaseInvoiceTotals,
  trackItemPriceFluctuation,
  recordInvoicePayment,
  generateHometaxPurchaseTaxSummary,
  calculateApAgingReport,
} from '../domain/vendorApInvoiceEngine';

const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vend-1',
    name: '(주)대한원두유통',
    businessNumber: '120-81-45678',
    representative: '김대표',
    contactPhone: '02-555-1234',
    email: 'order@koreabeans.co.kr',
    bankAccount: {
      bank: '기업은행',
      accountNumber: '010-1234-567890',
      accountHolder: '(주)대한원두유통',
    },
    paymentTerm: 'end_of_next_month',
    currentPayableBalance: 825000,
  },
  {
    id: 'vend-2',
    name: '밀본 헤어 코리아',
    businessNumber: '211-86-98765',
    representative: '박원장',
    contactPhone: '02-888-9900',
    email: 'milbon@haircare.com',
    bankAccount: {
      bank: '신한은행',
      accountNumber: '110-333-445566',
      accountHolder: '밀본헤어코리아',
    },
    paymentTerm: 'net_15',
    currentPayableBalance: 1200000,
  },
  {
    id: 'vend-3',
    name: '현대모비스 성수대리점',
    businessNumber: '105-82-11223',
    representative: '이모비스',
    contactPhone: '02-444-5566',
    email: 'mobis_sungsu@parts.com',
    bankAccount: {
      bank: '국민은행',
      accountNumber: '400401-01-223344',
      accountHolder: '현대모비스 성수점',
    },
    paymentTerm: 'end_of_month',
    currentPayableBalance: 0,
  },
];

const INITIAL_INVOICES: PurchaseInvoice[] = [
  {
    id: 'inv-202610-001',
    vendorId: 'vend-1',
    vendorName: '(주)대한원두유통',
    invoiceDate: '2026-10-02',
    dueDate: '2026-11-30',
    items: [
      { sku: 'BEAN-01', name: '스페셜티 에스프레소 블렌드 1kg', quantity: 20, unitPrice: 28000, supplyAmount: 560000, taxAmount: 56000, totalAmount: 616000 },
      { sku: 'SYRUP-01', name: '바닐라 빈 시럽 1L', quantity: 10, unitPrice: 19000, supplyAmount: 190000, taxAmount: 19000, totalAmount: 209000 },
    ],
    totalSupplyAmount: 750000,
    totalTaxAmount: 75000,
    totalAmount: 825000,
    taxInvoiceType: 'tax_invoice',
    taxInvoiceStatus: 'issued',
    hometaxApprovalNumber: '20261002-41000001-99887766',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    remainingAmount: 825000,
  },
  {
    id: 'inv-202609-002',
    vendorId: 'vend-2',
    vendorName: '밀본 헤어 코리아',
    invoiceDate: '2026-09-15',
    dueDate: '2026-09-30', // 연체 상태
    items: [
      { sku: 'PERM-01', name: '프리미엄 볼륨 펌제 400ml', quantity: 30, unitPrice: 32000, supplyAmount: 960000, taxAmount: 96000, totalAmount: 1056000 },
      { sku: 'COLOR-01', name: '올디브 염모제 80g (애쉬그레이)', quantity: 12, unitPrice: 12000, supplyAmount: 144000, taxAmount: 14400, totalAmount: 158400 },
    ],
    totalSupplyAmount: 1104000,
    totalTaxAmount: 110400,
    totalAmount: 1214400,
    taxInvoiceType: 'tax_invoice',
    taxInvoiceStatus: 'issued',
    hometaxApprovalNumber: '20260915-41000002-11223344',
    paymentStatus: 'partially_paid',
    paidAmount: 14400,
    remainingAmount: 1200000,
  },
  {
    id: 'inv-202609-003',
    vendorId: 'vend-3',
    vendorName: '현대모비스 성수대리점',
    invoiceDate: '2026-09-20',
    dueDate: '2026-09-30',
    items: [
      { sku: 'OIL-01', name: '가솔린 합성 엔진오일 5W-30 4L', quantity: 15, unitPrice: 45000, supplyAmount: 675000, taxAmount: 67500, totalAmount: 742500 },
    ],
    totalSupplyAmount: 675000,
    totalTaxAmount: 67500,
    totalAmount: 742500,
    taxInvoiceType: 'tax_invoice',
    taxInvoiceStatus: 'issued',
    paymentStatus: 'paid',
    paidAmount: 742500,
    remainingAmount: 0,
  },
];

export const VendorApInvoiceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'vendors' | 'price_trends' | 'tax_summary'>('invoices');
  const [vendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(INITIAL_INVOICES);

  // 신규 전표 등록 폼 상태
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(INITIAL_VENDORS[0].id);
  const [invoiceDate, setInvoiceDate] = useState('2026-10-15');
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemQuantity, setItemQuantity] = useState(10);
  const [itemUnitPrice, setItemUnitPrice] = useState(25000);
  const [isTaxExempt, setIsTaxExempt] = useState(false);

  // 대금 지급 모달 상태
  const [payingInvoice, setPayingInvoice] = useState<PurchaseInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);

  // KPI 집계
  const totalPayableOutstanding = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const currentMonthPurchases = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const currentMonthDeductibleTax = invoices.reduce((sum, inv) => sum + inv.totalTaxAmount, 0);
  const apAging = calculateApAgingReport(invoices, '2026-10-15');

  // 단가 변동 모니터링 샘플
  const priceTrends = [
    {
      sku: 'BEAN-01',
      name: '스페셜티 에스프레소 블렌드 1kg',
      vendor: '(주)대한원두유통',
      prevPrice: 24000,
      currPrice: 28000,
    },
    {
      sku: 'PERM-01',
      name: '프리미엄 볼륨 펌제 400ml',
      vendor: '밀본 헤어 코리아',
      prevPrice: 31000,
      currPrice: 32000,
    },
    {
      sku: 'OIL-01',
      name: '가솔린 합성 엔진오일 5W-30 4L',
      vendor: '현대모비스 성수대리점',
      prevPrice: 45000,
      currPrice: 45000,
    },
  ];

  // 세무 합계표 계산
  const taxSummary = generateHometaxPurchaseTaxSummary(invoices, '2026년 2기 예정 (7월~9월)');

  // 전표 추가 핸들러
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    if (!vendor) return;

    const totals = calculatePurchaseInvoiceTotals([
      {
        sku: itemSku || `SKU-${Date.now().toString().slice(-4)}`,
        name: itemName || '일반 입고 자재',
        quantity: itemQuantity,
        unitPrice: itemUnitPrice,
        isTaxExempt,
      },
    ]);

    const newInvoice: PurchaseInvoice = {
      id: `inv-${Date.now()}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      invoiceDate,
      dueDate,
      items: totals.items,
      totalSupplyAmount: totals.totalSupplyAmount,
      totalTaxAmount: totals.totalTaxAmount,
      totalAmount: totals.totalAmount,
      taxInvoiceType: isTaxExempt ? 'tax_exempt' : 'tax_invoice',
      taxInvoiceStatus: 'issued',
      hometaxApprovalNumber: `20261015-4100000${invoices.length + 1}-00000000`,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      remainingAmount: totals.totalAmount,
    };

    setInvoices([newInvoice, ...invoices]);
    setShowInvoiceModal(false);
    setItemName('');
    setItemSku('');
  };

  // 대금 지급 처리
  const handleConfirmPayment = () => {
    if (!payingInvoice) return;
    const { updatedInvoice } = recordInvoicePayment(payingInvoice, payAmount);

    setInvoices(invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    setPayingInvoice(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            공급처 원장 & 매입 세무 전표 (Vendor & AP)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            B2B 거래처 관리, 외상 매입금 미지급 잔액(AP), 원가 변동률 및 부가세 매입세액 공제 합계표
          </p>
        </div>
        <Button
          onClick={() => setShowInvoiceModal(true)}
          variant="primary"
          size="md"
          className="shrink-0"
        >
          + 매입 전표 등록
        </Button>
      </div>

      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">총 외상 매입금 (미지급 잔액)</div>
          <div className="text-2xl font-bold text-red-600 mt-1.5 tabular-nums font-mono">
            {formatNumberWithCommas(totalPayableOutstanding)}원
          </div>
          <div className={`text-xs mt-1 tabular-nums ${apAging.overdue1To30Days > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {apAging.overdue1To30Days > 0 ? `⚠️ 만기 경과 연체: ${formatNumberWithCommas(apAging.overdue1To30Days)}원` : '✓ 정상 만기 미도래'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">등록 매입 전표 총액</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums font-mono">
            {formatNumberWithCommas(currentMonthPurchases)}원
          </div>
          <div className="text-xs text-slate-400 mt-1 tabular-nums font-mono">
            총 {invoices.length}건 (공급가액 {formatNumberWithCommas(currentMonthPurchases - currentMonthDeductibleTax)}원)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">부가세 매입세액 공제 예상액</div>
          <div className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums font-mono">
            {formatNumberWithCommas(currentMonthDeductibleTax)}원
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            세무 신고 시 부가세 납부세액에서 전액 차감
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">등록 공급처 (거래처)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums font-mono">
            {vendors.length}개사
          </div>
          <div className="text-xs text-slate-400 mt-1">
            외상 거래처 {vendors.filter((v) => v.currentPayableBalance > 0).length}곳
          </div>
        </div>
      </div>

      {/* 네비게이션 탭 */}
      <div className="flex border-b border-slate-200 gap-2 pb-2">
        {[
          { key: 'invoices', label: '매입 전표 & 외상 관리' },
          { key: 'vendors', label: '공급처(Vendor) 원장' },
          { key: 'price_trends', label: '품목별 단가 변동 모니터링' },
          { key: 'tax_summary', label: '홈택스 세금계산서 합계표' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 탭 1: 매입 전표 및 외상 관리 */}
      {activeTab === 'invoices' && (
        invoices.length === 0 ? (
          <EmptyState
            title="등록된 매입 전표가 없습니다."
            description="우측 상단의 '+ 매입 전표 등록' 버튼을 눌러 거래처 매입 전표를 등록하세요."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">전표번호 / 매입일</th>
                    <th className="px-4 py-3">공급처명</th>
                    <th className="px-4 py-3">품목 요약</th>
                    <th className="px-4 py-3 text-right">공급가액</th>
                    <th className="px-4 py-3 text-right">부가세</th>
                    <th className="px-4 py-3 text-right">총 매입액</th>
                    <th className="px-4 py-3">결제 기한</th>
                    <th className="px-4 py-3 text-center">상태 / 결제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{inv.id}</div>
                        <div className="text-xs text-slate-500 tabular-nums">{inv.invoiceDate}</div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {inv.vendorName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {inv.items[0]?.name || '자재'}
                        {inv.items.length > 1 ? ` 외 ${inv.items.length - 1}건` : ''}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums font-mono">
                        {formatNumberWithCommas(inv.totalSupplyAmount)}원
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 tabular-nums font-mono">
                        {formatNumberWithCommas(inv.totalTaxAmount)}원
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums font-mono">
                        {formatNumberWithCommas(inv.totalAmount)}원
                      </td>
                      <td className={`px-4 py-3.5 tabular-nums ${new Date(inv.dueDate) < new Date('2026-10-15') && inv.remainingAmount > 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                        {inv.dueDate}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {inv.paymentStatus === 'paid' ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                            완납 완료
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums font-mono ${
                              inv.paymentStatus === 'partially_paid'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {inv.paymentStatus === 'partially_paid' ? '부분지급' : '미지급'} (잔액 {formatNumberWithCommas(inv.remainingAmount)}원)
                            </span>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPayAmount(inv.remainingAmount);
                              }}
                            >
                              대금 결제
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 탭 2: 공급처(Vendor) 원장 */}
      {activeTab === 'vendors' && (
        vendors.length === 0 ? (
          <EmptyState
            title="등록된 공급처가 없습니다."
            description="거래처 정보를 등록하여 외상 미지급금 및 세무 전표를 관리하세요."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-base font-bold text-slate-900">{v.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium shrink-0">
                      {v.paymentTerm === 'end_of_next_month' ? '익월 말 결제' : v.paymentTerm === 'end_of_month' ? '당월 말 결제' : '15일 후 결제'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <div><strong>사업자등록번호:</strong> <span className="tabular-nums font-mono">{v.businessNumber}</span> (대표: {v.representative})</div>
                    <div><strong>담당 연락처:</strong> <span className="tabular-nums font-mono">{v.contactPhone}</span></div>
                    {v.email && <div><strong>전자세금계산서 메일:</strong> {v.email}</div>}
                    <div><strong>입금 계좌:</strong> {v.bankAccount.bank} <span className="tabular-nums font-mono">{v.bankAccount.accountNumber}</span> ({v.bankAccount.accountHolder})</div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500">현재 외상 미지급 잔액:</span>
                  <span className={`text-sm sm:text-base font-bold tabular-nums font-mono ${v.currentPayableBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatNumberWithCommas(v.currentPayableBalance)}원
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 탭 3: 품목별 단가 변동 모니터링 */}
      {activeTab === 'price_trends' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            납품 단가 급등 및 변동 모니터링 (직전 대비)
          </h3>
          <div className="flex flex-col gap-3">
            {priceTrends.map((trend) => {
              const check = trackItemPriceFluctuation(trend.prevPrice, trend.currPrice, 10);
              return (
                <div
                  key={trend.sku}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    check.isPriceSurge ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{trend.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      SKU: <span className="font-mono">{trend.sku}</span> | 공급처: {trend.vendor}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-bold tabular-nums font-mono text-slate-900">
                      <span className="line-through text-slate-400 mr-2 text-xs font-normal">
                        {formatNumberWithCommas(trend.prevPrice)}원
                      </span>
                      → {formatNumberWithCommas(trend.currPrice)}원
                    </div>
                    <div className={`text-xs font-semibold mt-0.5 tabular-nums font-mono ${check.changeRatePercent > 0 ? 'text-red-600' : check.changeRatePercent < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {check.changeRatePercent > 0 ? `▲ +${check.changeRatePercent}% 인상` : check.changeRatePercent < 0 ? `▼ ${check.changeRatePercent}% 인하` : '변동 없음'}
                      {check.isPriceSurge && ' (⚠️ 10% 초과 급등)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 탭 4: 홈택스 세금계산서 합계표 */}
      {activeTab === 'tax_summary' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                부가가치세 매입처별 세금계산서 합계표
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                과세기간: {taxSummary.periodLabel} (세무사 사무소 제출 및 홈택스 신고용 전산 데이터)
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => showToast('세무사 제출용 매입 세금계산서 합계표(Excel)가 다운로드되었습니다.', 'success')}
              className="shrink-0 flex items-center gap-1.5"
            >
              📊 세무 신고용 엑셀 추출
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">매입처(공급처) 수</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">{taxSummary.totalVendorCount}개소</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">세금계산서 매수</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">{taxSummary.totalInvoiceCount}매</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">총 공급가액</div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">{formatNumberWithCommas(taxSummary.totalSupplyAmount)}원</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">공제대상 매입세액</div>
              <div className="text-xl font-bold text-blue-600 mt-1 tabular-nums font-mono">{formatNumberWithCommas(taxSummary.totalDeductibleTax)}원</div>
            </div>
          </div>
        </div>
      )}

      {/* 대금 결제 표준 Modal */}
      {payingInvoice && (
        <Modal
          isOpen={!!payingInvoice}
          onClose={() => setPayingInvoice(null)}
          title="외상 매입 대금 결제"
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-800">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div><strong>공급처:</strong> {payingInvoice.vendorName}</div>
              <div><strong>전표 총액:</strong> <span className="tabular-nums font-mono">{formatNumberWithCommas(payingInvoice.totalAmount)}원</span></div>
              <div><strong>잔여 미지급액:</strong> <span className="tabular-nums font-mono text-red-600 font-bold">{formatNumberWithCommas(payingInvoice.remainingAmount)}원</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                지급 금액 입력 (원)
              </label>
              <input
                type="number"
                value={payAmount}
                max={payingInvoice.remainingAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setPayingInvoice(null)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmPayment}
              >
                지급 확정
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 신규 매입 전표 등록 표준 Modal */}
      {showInvoiceModal && (
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title="신규 매입 전표 등록"
        >
          <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs sm:text-sm text-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">공급처 선택</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.businessNumber})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">매입 일자</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">외상 결제 예정일</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">품목명</label>
              <input
                type="text"
                placeholder="예: 원두 1kg, 펌제, 엔진오일"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">입고 수량</label>
                <input
                  type="number"
                  value={itemQuantity}
                  min={1}
                  onChange={(e) => setItemQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">단가 (원)</label>
                <input
                  type="number"
                  value={itemUnitPrice}
                  min={0}
                  onChange={(e) => setItemUnitPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTaxExempt}
                  onChange={(e) => setIsTaxExempt(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                면세 품목 (농수산물 등 부가세 0원 처리)
              </label>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowInvoiceModal(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
              >
                전표 생성
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
