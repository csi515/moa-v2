import React, { useState } from 'react';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Scissors,
} from 'lucide-react';
import {
  SoldPackageContract,
  calculatePackageRealization,
  consumePackageUnits,
  calculatePackageCancellationRefund,
  summarizeStoreLiabilityPortfolio,
} from '../domain/packageSplitBillingEngine';

export function PackageSplitBillingManagementView() {
  const [packages, setPackages] = useState<SoldPackageContract[]>([
    {
      id: 'pkg_sample_1',
      customerName: '최우식',
      packageName: '헬스 3개월 + 1:1 PT 10회 콤보',
      totalPackagePrice: 1000000,
      soldAt: '2026-09-15T00:00:00Z',
      status: 'active',
      subItems: [
        {
          id: 'sub_1',
          name: '헬스장 3개월 정기권',
          type: 'period_days',
          allocatedPrice: 300000,
          totalUnits: 90,
          consumedUnits: 30,
        },
        {
          id: 'sub_2',
          name: '1:1 PT 10회',
          type: 'session',
          allocatedPrice: 700000,
          totalUnits: 10,
          consumedUnits: 4,
        },
      ],
    },
    {
      id: 'pkg_sample_2',
      customerName: '김다미',
      packageName: '피부 에스테틱 5회 코스 + 홈케어 세트',
      totalPackagePrice: 600000,
      soldAt: '2026-10-01T00:00:00Z',
      status: 'active',
      subItems: [
        {
          id: 'sub_3',
          name: '리프팅 관리 5회',
          type: 'session',
          allocatedPrice: 450000,
          totalUnits: 5,
          consumedUnits: 2,
        },
        {
          id: 'sub_4',
          name: '에스테틱 화장품 키트',
          type: 'session',
          allocatedPrice: 150000,
          totalUnits: 1,
          consumedUnits: 1, // 수령 즉시 실현
        },
      ],
    },
  ]);

  const [refundTargetPkg, setRefundTargetPkg] = useState<SoldPackageContract | null>(null);

  const portfolioSummary = summarizeStoreLiabilityPortfolio(packages);

  const handleConsume = (pkgId: string, subId: string) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === pkgId ? consumePackageUnits(pkg, subId, 1) : pkg))
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 헤더 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            복합 패키지 분할 매출 귀속 & 선수금 부채 관리
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            결합 상품 일시불 결제액을 전액 매출로 잡지 않고 선수금 부채로 보관하여 흑자도산 위험을 방어합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-2xl text-xs font-bold border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          세무/회계 왜곡 및 매출 과대계상 방지
        </div>
      </div>

      {/* 포트폴리오 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">패키지 총 판매 결제액</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            ₩{(portfolioSummary.totalSoldVolume / 10000).toLocaleString()}<span className="text-xs font-semibold text-slate-400">만 원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">총 {packages.length}건 패키지 계약</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">현재 선수금 부채 잔액</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₩{(portfolioSummary.totalCurrentUnearnedLiability / 10000).toLocaleString()}<span className="text-xs font-semibold text-slate-400">만 원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">미제공 서비스 의무 부채</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">실현된 누적 당월 매출</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₩{(portfolioSummary.totalCumulativeRecognizedRevenue / 10000).toLocaleString()}<span className="text-xs font-semibold text-slate-400">만 원</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">이용 소진에 따른 전입액</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">전체 매출 실현율</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {portfolioSummary.overallRealizationRatePercent}<span className="text-xs font-semibold text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">소진 진행 지수</div>
        </div>
      </div>

      {/* 패키지별 분할 귀속 상세 목록 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">회원별 복합 패키지 소진 및 매출 귀속 현황</h2>
          <span className="text-xs text-slate-400">총 {packages.length}개 계약</span>
        </div>

        <div className="divide-y divide-slate-100">
          {packages.map((pkg) => {
            const realization = calculatePackageRealization(pkg);

            return (
              <div key={pkg.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 text-sm">{pkg.customerName} 회원</span>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {pkg.packageName}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        (결제: ₩{pkg.totalPackagePrice.toLocaleString()})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      결제일: {pkg.soldAt.slice(0, 10)} · 현재 실현 매출: <strong className="text-emerald-600">₩{realization.totalRecognizedRevenue.toLocaleString()}</strong> · 남은 선수금: <strong className="text-rose-600">₩{realization.remainingUnearnedLiability.toLocaleString()}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRefundTargetPkg(pkg)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 self-start sm:self-center"
                  >
                    <Scissors className="w-3.5 h-3.5" /> 중도 해지 환불금 산출
                  </button>
                </div>

                {/* 하위 항목별 분할 소진 상태 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {pkg.subItems.map((item) => {
                    const percent = Math.round((item.consumedUnits / item.totalUnits) * 100);
                    const unitPrice = Math.round(item.allocatedPrice / item.totalUnits);

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-800">{item.name}</strong>
                          <span className="text-slate-500 font-mono">
                            {item.consumedUnits} / {item.totalUnits} {item.type === 'session' ? '회' : '일'} ({percent}%)
                          </span>
                        </div>

                        {/* 진행 바 */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>배분금: ₩{item.allocatedPrice.toLocaleString()} (회당 ₩{unitPrice.toLocaleString()})</span>
                          {item.type === 'session' && item.consumedUnits < item.totalUnits && (
                            <button
                              type="button"
                              onClick={() => handleConsume(pkg.id, item.id)}
                              className="px-2 py-0.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-2xs"
                            >
                              +1회 이용 차감
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 중도 해지 환불금 산출 모달 */}
      {refundTargetPkg && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Scissors className="w-4 h-4 text-rose-600" />
                공정위 기준 중도 해지 정산서
              </h3>
              <button
                type="button"
                onClick={() => setRefundTargetPkg(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const refund = calculatePackageCancellationRefund(refundTargetPkg);
              return (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <span>계약 패키지</span>
                      <strong className="text-slate-800">{refundTargetPkg.packageName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>일시불 결제총액</span>
                      <span className="font-bold">₩{refund.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>현재까지 실현된 이용 매출</span>
                      <span className="font-bold">- ₩{refund.recognizedRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                      <span>미실현 선수금 잔액</span>
                      <span>₩{refund.unearnedLiability.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>법정 위약금 (총액의 10%)</span>
                      <span className="font-bold">- ₩{refund.penaltyFee.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-rose-800 font-bold">최종 환불 지급 기준액</div>
                      <div className="text-[11px] text-slate-500">선수금 잔액 - 위약금 10%</div>
                    </div>
                    <div className="text-xl font-black text-rose-600">
                      ₩{refund.refundAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setRefundTargetPkg(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 mt-2"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
