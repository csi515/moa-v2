import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  PlusCircle,
  FileText,
  CreditCard,
  Percent,
  Download,
  Send,
  AlertCircle,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateStaffPayroll,
  summarizePayrollBatch,
  formatKoreanWon,
  type StaffPayrollPolicy,
  type ServicePerformanceItem,
  type PaymentMethod,
} from '../domain/commissionPayrollEngine';

const STORAGE_KEY_POLICIES = 'moa_commission_payroll_policies';
const STORAGE_KEY_ITEMS = 'moa_commission_payroll_items';

const DEFAULT_POLICIES: StaffPayrollPolicy[] = [
  {
    staffId: 'staff-mina',
    staffName: '이지은 실장',
    role: '수석 스타일리스트 / 디자이너',
    baseSalary: 500000,
    defaultCommissionRate: 0.5, // 50%
    cardFeeDeductionRate: 0.03, // 3%
    withholdingTaxRate: 0.033, // 3.3%
    fixedDeductions: 50000, // 살롱 기물 관리비
  },
  {
    staffId: 'staff-james',
    staffName: '강태풍 트레이너',
    role: '시니어 1:1 PT 마스터',
    baseSalary: 1000000,
    defaultCommissionRate: 0.45, // 45%
    cardFeeDeductionRate: 0.03,
    withholdingTaxRate: 0.033,
    fixedDeductions: 0,
  },
  {
    staffId: 'staff-park',
    staffName: '박준혁 미캐닉',
    role: '수입차 전문 정비 수석',
    baseSalary: 1500000,
    defaultCommissionRate: 0.35, // 35%
    cardFeeDeductionRate: 0.0,
    withholdingTaxRate: 0.033,
    fixedDeductions: 100000,
  },
];

const DEFAULT_ITEMS: ServicePerformanceItem[] = [
  {
    id: 'perf-1',
    staffId: 'staff-mina',
    serviceDate: '2026-10-10',
    serviceName: '시그니처 레이어드 펌 & 클리닉',
    customerName: '김수진',
    grossSales: 220000,
    paymentMethod: 'card',
    materialCost: 15000,
  },
  {
    id: 'perf-2',
    staffId: 'staff-mina',
    serviceDate: '2026-10-11',
    serviceName: '디자인 컷 & 프리미엄 염색',
    customerName: '이현우',
    grossSales: 160000,
    paymentMethod: 'card',
    materialCost: 10000,
  },
  {
    id: 'perf-3',
    staffId: 'staff-mina',
    serviceDate: '2026-10-12',
    serviceName: 'VIP 맞춤 두피 케어 스파',
    customerName: '박서현',
    grossSales: 120000,
    paymentMethod: 'cash',
    customRate: 0.6, // 60% 특별 우대
  },
  {
    id: 'perf-4',
    staffId: 'staff-james',
    serviceDate: '2026-10-08',
    serviceName: '1:1 재활 & 코어 PT 20회',
    customerName: '최도현',
    grossSales: 1400000,
    paymentMethod: 'card',
  },
  {
    id: 'perf-5',
    staffId: 'staff-james',
    serviceDate: '2026-10-12',
    serviceName: '바디프로필 집중 PT 10회',
    customerName: '정유라',
    grossSales: 800000,
    paymentMethod: 'card',
  },
  {
    id: 'perf-6',
    staffId: 'staff-park',
    serviceDate: '2026-10-13',
    serviceName: '브레이크 디스크 및 패드 풀 교환',
    customerName: '한상우',
    grossSales: 650000,
    paymentMethod: 'card',
    materialCost: 200000,
  },
];

export const CommissionPayrollManagementView: React.FC = () => {
  const [policies, setPolicies] = useState<StaffPayrollPolicy[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_POLICIES));
      return saved ? JSON.parse(saved) : DEFAULT_POLICIES;
    } catch {
      return DEFAULT_POLICIES;
    }
  });

  const [items, setItems] = useState<ServicePerformanceItem[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_ITEMS));
      return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string>(DEFAULT_POLICIES[0].staffId);
  const [showAddModal, setShowAddModal] = useState(false);

  // 신규 실적 등록 폼 상태
  const [newServiceName, setNewServiceName] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newGrossSales, setNewGrossSales] = useState<number>(100000);
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('card');
  const [newMaterialCost, setNewMaterialCost] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_POLICIES), JSON.stringify(policies));
    } catch {}
  }, [policies]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_ITEMS), JSON.stringify(items));
    } catch {}
  }, [items]);

  const summary = useMemo(() => {
    return summarizePayrollBatch(policies, items);
  }, [policies, items]);

  const selectedPolicy = policies.find((p) => p.staffId === selectedStaffId) || policies[0];
  const selectedStatement = useMemo(() => {
    return calculateStaffPayroll(selectedPolicy, items);
  }, [selectedPolicy, items]);

  const selectedItems = useMemo(() => {
    return items.filter((it) => it.staffId === selectedPolicy.staffId);
  }, [items, selectedPolicy.staffId]);

  const handleAddPerformance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newCustomerName.trim() || newGrossSales <= 0) {
      showToast('서비스명, 고객명, 금액을 올바르게 입력해주세요.', 'error');
      return;
    }

    const newItem: ServicePerformanceItem = {
      id: `perf-${Date.now()}`,
      staffId: selectedStaffId,
      serviceDate: new Date().toISOString().slice(0, 10),
      serviceName: newServiceName.trim(),
      customerName: newCustomerName.trim(),
      grossSales: newGrossSales,
      paymentMethod: newPaymentMethod,
      materialCost: newMaterialCost > 0 ? newMaterialCost : undefined,
    };

    setItems((prev) => [newItem, ...prev]);
    setShowAddModal(false);
    setNewServiceName('');
    setNewCustomerName('');
    setNewGrossSales(100000);
    setNewMaterialCost(0);
    showToast(`${selectedPolicy.staffName} 실적이 성공적으로 등록되었습니다.`, 'success');
  };

  const handleSendStatement = () => {
    showToast(
      `${selectedPolicy.staffName}님께 3.3% 원천징수 정산명세서가 알림톡으로 전송되었습니다.`,
      'success'
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              전문가·프리랜서 인센티브 & 요율 정산
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            디자이너·트레이너·강사의 매출 기여도 요율과 3.3% 사업소득세 원천징수를 자동 계산합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            실적(매출) 등록
          </button>
          <button
            onClick={handleSendStatement}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Send className="w-4 h-4" />
            명세서 발송
          </button>
        </div>
      </div>

      {/* 종합 메트릭 카드 4종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">당월 총 서비스 매출</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatKoreanWon(summary.totalGrossSales)}
          </div>
          <p className="text-xs text-slate-400 mt-1">전체 전문가 {summary.totalStaffCount}명 합계</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">총 세전 인센티브/수당</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {formatKoreanWon(summary.totalPreTaxEarnings)}
          </div>
          <p className="text-xs text-slate-400 mt-1">기본급 + 요율 커미션 - 공제</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">3.3% 원천징수 세액</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {formatKoreanWon(summary.totalWithholdingTax)}
          </div>
          <p className="text-xs text-slate-400 mt-1">소득세 3% + 지방소득세 0.3%</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">총 세후 실지급액</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatKoreanWon(summary.totalNetPayout)}
          </div>
          <p className="text-xs text-slate-400 mt-1">실제 계좌 이체 예정 금액</p>
        </div>
      </div>

      {/* 전문가 탭 선택기 */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {policies.map((p) => {
          const isSelected = p.staffId === selectedStaffId;
          return (
            <button
              key={p.staffId}
              onClick={() => setSelectedStaffId(p.staffId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{p.staffName}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {p.role}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택된 전문가 상세 정산 명세서 & 실적 테이블 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 정산 명세서 요약 카드 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{selectedPolicy.staffName}</h2>
              <p className="text-xs text-slate-500">{selectedPolicy.role}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                커미션 요율 {Math.round(selectedPolicy.defaultCommissionRate * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>수행 실적 건수</span>
              <span className="font-semibold text-slate-900">{selectedStatement.performanceCount}건</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>총 매출 기여액</span>
              <span className="font-semibold text-slate-900">{formatKoreanWon(selectedStatement.totalGrossSales)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>기본급</span>
              <span className="font-semibold text-slate-900">{formatKoreanWon(selectedStatement.baseSalary)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>매출 인센티브 수당</span>
              <span className="font-semibold text-indigo-600">+{formatKoreanWon(selectedStatement.totalCommission)}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs text-red-500">
                <span>카드 결제 수수료 공제 (3%)</span>
                <span>-{formatKoreanWon(selectedStatement.totalCardFeeDeduction)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-500">
                <span>재료비 / 부대비용 공제</span>
                <span>-{formatKoreanWon(selectedStatement.totalMaterialDeduction)}</span>
              </div>
              {selectedStatement.totalFixedDeductions > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span>고정 공제금</span>
                  <span>-{formatKoreanWon(selectedStatement.totalFixedDeductions)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>세전 정산 총액</span>
              <span>{formatKoreanWon(selectedStatement.preTaxEarnings)}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>사업소득세 (3%)</span>
                <span>{formatKoreanWon(selectedStatement.incomeTax)}</span>
              </div>
              <div className="flex justify-between">
                <span>지방소득세 (0.3%)</span>
                <span>{formatKoreanWon(selectedStatement.localIncomeTax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700 pt-1 border-t border-slate-200">
                <span>원천징수 합계 (3.3%)</span>
                <span>{formatKoreanWon(selectedStatement.totalWithholdingTax)}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-indigo-100">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">세후 실지급액</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {formatKoreanWon(selectedStatement.netPayout)}
                </span>
              </div>
              <p className="text-xs text-slate-400 text-right mt-1">
                실효 지급율 {selectedStatement.effectiveCommissionRate}%
              </p>
            </div>
          </div>
        </div>

        {/* 우측: 수행 실적(시술/레슨/정비) 상세 목록 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>당월 수행 실적 명세 ({selectedItems.length}건)</span>
            </h3>
            <span className="text-xs text-slate-500">
              실시간 매출과 연동되어 수당이 자동 계산됩니다.
            </span>
          </div>

          {selectedItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">등록된 실적 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">일자</th>
                    <th className="py-2.5 px-3">고객명</th>
                    <th className="py-2.5 px-3">서비스·시술명</th>
                    <th className="py-2.5 px-3 text-right">매출액</th>
                    <th className="py-2.5 px-3 text-center">결제수단</th>
                    <th className="py-2.5 px-3 text-right">인센티브</th>
                    <th className="py-2.5 px-3 text-right">공제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedItems.map((item) => {
                    const rate = item.customRate ?? selectedPolicy.defaultCommissionRate;
                    const commission = Math.round(item.grossSales * rate);
                    const cardFee =
                      item.paymentMethod === 'card'
                        ? Math.round(item.grossSales * (selectedPolicy.cardFeeDeductionRate ?? 0))
                        : 0;
                    const deduction = cardFee + (item.materialCost ?? 0);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                          {item.serviceDate}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {item.customerName}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{item.serviceName}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatKoreanWon(item.grossSales)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${
                              item.paymentMethod === 'card'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.paymentMethod === 'card' ? '카드' : '현금/이체'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-600 font-semibold whitespace-nowrap">
                          {formatKoreanWon(commission)}
                          <span className="text-xs text-slate-400 block font-normal">
                            ({Math.round(rate * 100)}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-red-500 text-xs whitespace-nowrap">
                          {deduction > 0 ? `-${formatKoreanWon(deduction)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 신규 실적 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedPolicy.staffName} 실적 등록
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPerformance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  시술/레슨/정비 서비스명
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="예: 발레아쥬 옴브레 염색, 1:1 PT 10회 등"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">고객명</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="고객 이름"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">매출액 (원)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={newGrossSales}
                    onChange={(e) => setNewGrossSales(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">결제 수단</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="card">신용카드</option>
                    <option value="cash">현금</option>
                    <option value="transfer">계좌이체</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  재료비/부자재 실비 공제액 (선택)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={newMaterialCost}
                  onChange={(e) => setNewMaterialCost(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
