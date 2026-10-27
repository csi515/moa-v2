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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            공급처 원장 & 매입 세무 전표 (Vendor & AP)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            B2B 거래처 관리, 외상 매입금 미지급 잔액(AP), 원가 변동률 및 부가세 매입세액 공제 합계표
          </p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          style={{
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          + 매입 전표 등록
        </button>
      </div>

      {/* KPI 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>총 외상 매입금 (미지급 잔액)</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#dc2626', marginTop: '6px' }}>
            {totalPayableOutstanding.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: apAging.overdue1To30Days > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {apAging.overdue1To30Days > 0 ? `⚠️ 만기 경과 연체: ${apAging.overdue1To30Days.toLocaleString()}원` : '✓ 정상 만기 미도래'}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>등록 매입 전표 총액</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', marginTop: '6px' }}>
            {currentMonthPurchases.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            총 {invoices.length}건 (공급가액 {(currentMonthPurchases - currentMonthDeductibleTax).toLocaleString()}원)
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>부가세 매입세액 공제 예상액</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginTop: '6px' }}>
            {currentMonthDeductibleTax.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            세무 신고 시 부가세 납부세액에서 전액 차감
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>등록 공급처 (거래처)</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#059669', marginTop: '6px' }}>
            {vendors.length}개사
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            외상 거래처 {vendors.filter((v) => v.currentPayableBalance > 0).length}곳
          </div>
        </div>
      </div>

      {/* 네비게이션 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px', gap: '8px' }}>
        {[
          { key: 'invoices', label: '매입 전표 & 외상 관리' },
          { key: 'vendors', label: '공급처(Vendor) 원장' },
          { key: 'price_trends', label: '품목별 단가 변동 모니터링' },
          { key: 'tax_summary', label: '홈택스 세금계산서 합계표' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: activeTab === tab.key ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 1: 매입 전표 및 외상 관리 */}
      {activeTab === 'invoices' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '12px 16px' }}>전표번호 / 매입일</th>
                <th style={{ padding: '12px 16px' }}>공급처명</th>
                <th style={{ padding: '12px 16px' }}>품목 요약</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>공급가액</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>부가세</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>총 매입액</th>
                <th style={{ padding: '12px 16px' }}>결제 기한</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>상태 / 결제</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{inv.id}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{inv.invoiceDate}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1f2937' }}>
                    {inv.vendorName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>
                    {inv.items[0]?.name || '자재'}
                    {inv.items.length > 1 ? ` 외 ${inv.items.length - 1}건` : ''}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#374151' }}>
                    {inv.totalSupplyAmount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#374151' }}>
                    {inv.totalTaxAmount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                    {inv.totalAmount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', color: new Date(inv.dueDate) < new Date('2026-10-15') && inv.remainingAmount > 0 ? '#dc2626' : '#4b5563' }}>
                    {inv.dueDate}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {inv.paymentStatus === 'paid' ? (
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                        완납 완료
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ background: inv.paymentStatus === 'partially_paid' ? '#fef3c7' : '#fee2e2', color: inv.paymentStatus === 'partially_paid' ? '#d97706' : '#dc2626', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {inv.paymentStatus === 'partially_paid' ? '부분지급' : '미지급'} (잔액 {inv.remainingAmount.toLocaleString()}원)
                        </span>
                        <button
                          onClick={() => {
                            setPayingInvoice(inv);
                            setPayAmount(inv.remainingAmount);
                          }}
                          style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          대금 결제
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 탭 2: 공급처(Vendor) 원장 */}
      {activeTab === 'vendors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {vendors.map((v) => (
            <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{v.name}</h3>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#4b5563' }}>
                  {v.paymentTerm === 'end_of_next_month' ? '익월 말 결제' : v.paymentTerm === 'end_of_month' ? '당월 말 결제' : '15일 후 결제'}
                </span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>
                <div><strong>사업자등록번호:</strong> {v.businessNumber} (대표: {v.representative})</div>
                <div><strong>담당 연락처:</strong> {v.contactPhone}</div>
                {v.email && <div><strong>전자세금계산서 메일:</strong> {v.email}</div>}
                <div><strong>입금 계좌:</strong> {v.bankAccount.bank} {v.bankAccount.accountNumber} ({v.bankAccount.accountHolder})</div>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>현재 외상 미지급 잔액:</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: v.currentPayableBalance > 0 ? '#dc2626' : '#10b981' }}>
                  {v.currentPayableBalance.toLocaleString()}원
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 탭 3: 품목별 단가 변동 모니터링 */}
      {activeTab === 'price_trends' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            납품 단가 급등 및 변동 모니터링 (직전 대비)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {priceTrends.map((trend) => {
              const check = trackItemPriceFluctuation(trend.prevPrice, trend.currPrice, 10);
              return (
                <div
                  key={trend.sku}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: check.isPriceSurge ? '#fef2f2' : '#f9fafb',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{trend.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      SKU: {trend.sku} | 공급처: {trend.vendor}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>
                      <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: '8px', fontSize: '13px' }}>
                        {trend.prevPrice.toLocaleString()}원
                      </span>
                      → {trend.currPrice.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: check.changeRatePercent > 0 ? '#dc2626' : '#059669', marginTop: '2px' }}>
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
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                부가가치세 매입처별 세금계산서 합계표
              </h3>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
                과세기간: {taxSummary.periodLabel} (세무사 사무소 제출 및 홈택스 신고용 전산 데이터)
              </p>
            </div>
            <button
              onClick={() => alert('세무사 제출용 매입 세금계산서 합계표(Excel)가 다운로드되었습니다.')}
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              📊 세무 신고용 엑셀 추출
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>매입처(공급처) 수</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>{taxSummary.totalVendorCount}개소</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>세금계산서 매수</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>{taxSummary.totalInvoiceCount}매</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>총 공급가액</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>{taxSummary.totalSupplyAmount.toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>공제대상 매입세액</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>{taxSummary.totalDeductibleTax.toLocaleString()}원</div>
            </div>
          </div>
        </div>
      )}

      {/* 대금 지급 모달 */}
      {payingInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '420px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>외상 매입 대금 결제</h3>
            <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
              <div><strong>공급처:</strong> {payingInvoice.vendorName}</div>
              <div><strong>전표 총액:</strong> {payingInvoice.totalAmount.toLocaleString()}원</div>
              <div><strong>잔여 미지급액:</strong> {payingInvoice.remainingAmount.toLocaleString()}원</div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                지급 금액 입력 (원)
              </label>
              <input
                type="number"
                value={payAmount}
                max={payingInvoice.remainingAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '15px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setPayingInvoice(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmPayment}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                지급 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 매입 전표 등록 모달 */}
      {showInvoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '480px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>신규 매입 전표 등록</h3>
            <form onSubmit={handleCreateInvoice}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>공급처 선택</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.businessNumber})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>매입 일자</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>외상 결제 예정일</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>품목명</label>
                <input
                  type="text"
                  placeholder="예: 원두 1kg, 펌제, 엔진오일"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>입고 수량</label>
                  <input
                    type="number"
                    value={itemQuantity}
                    min={1}
                    onChange={(e) => setItemQuantity(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>단가 (원)</label>
                  <input
                    type="number"
                    value={itemUnitPrice}
                    min={0}
                    onChange={(e) => setItemUnitPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isTaxExempt}
                    onChange={(e) => setIsTaxExempt(e.target.checked)}
                  />
                  면세 품목 (농수산물 등 부가세 0원 처리)
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  전표 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
