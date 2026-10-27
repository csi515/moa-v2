import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  DepositEscrowRecord,
  calculateFinalSettlement,
  evaluateCancellationRefund,
  summarizeDepositEscrowMetrics,
} from '../domain/depositEscrowEngine';

export function DepositEscrowManagementView() {
  const [records, setRecords] = useState<DepositEscrowRecord[]>([
    {
      id: 'dep_sample_1',
      bookingId: 'bk_101',
      customerName: '정우성',
      serviceName: '루프탑 파티룸 (5시간 대관)',
      totalEstimatedFee: 250000,
      depositAmount: 70000,
      status: 'checked_in',
      bookingScheduledAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
    {
      id: 'dep_sample_2',
      bookingId: 'bk_102',
      customerName: '한지민',
      serviceName: '1:1 VIP PT 10회 코스',
      totalEstimatedFee: 700000,
      depositAmount: 100000,
      status: 'held',
      bookingScheduledAt: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    {
      id: 'dep_sample_3',
      bookingId: 'bk_103',
      customerName: '강동원',
      serviceName: '프로필 콘셉트 사진 촬영',
      totalEstimatedFee: 180000,
      depositAmount: 50000,
      status: 'deducted_settled',
      bookingScheduledAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      finalPaidAmount: 130000,
      settledAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
  ]);

  // 현장 즉시 정산 모달용 상태
  const [settlingRecord, setSettlingRecord] = useState<DepositEscrowRecord | null>(null);
  const [actualTotalFee, setActualTotalFee] = useState<number>(0);

  const metrics = summarizeDepositEscrowMetrics(records);

  const handleOpenSettle = (record: DepositEscrowRecord) => {
    setSettlingRecord(record);
    setActualTotalFee(record.totalEstimatedFee);
  };

  const handleConfirmSettle = () => {
    if (!settlingRecord) return;
    const calc = calculateFinalSettlement({
      totalServiceFee: actualTotalFee,
      depositAmount: settlingRecord.depositAmount,
    });

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== settlingRecord.id) return r;
        return {
          ...r,
          status: 'deducted_settled',
          finalPaidAmount: calc.netPayableAmount,
          settledAt: new Date().toISOString(),
        };
      })
    );
    setSettlingRecord(null);
  };

  const handleCheckIn = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'checked_in' } : r))
    );
  };

  const handleForfeitNoShow = (id: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'forfeited_noshow',
              forfeitedPenaltyAmount: r.depositAmount,
              settledAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const handleRefund = (id: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'refunded',
              settledAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 헤더 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            예약 보증금 에스크로 & 노쇼 방지 차감 정산
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            당일 노쇼 공실 손실을 방지하고, 고객 방문 시 사전 예치금을 최종 청구액에서 자동 차감합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold border border-emerald-100">
          <Sparkles className="w-3.5 h-3.5" />
          노쇼 공실 손실 0원 보장
        </div>
      </div>

      {/* 재무 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">예치 중인 보증금</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            ₩{metrics.totalActiveHeldDeposit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">체크인 대기 상태</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">정산 차감 누적액</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₩{metrics.totalSettledDeductions.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">결제 시 자동 상환</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">노쇼 위약금 전입액</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₩{metrics.totalForfeitedPenaltyIncome.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">당일 불참 몰수 수입</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">사전 취소 환불액</div>
          <div className="text-2xl font-black text-slate-700 mt-1">
            ₩{metrics.totalRefundedDeposit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">24시간 전 정상 취소</div>
        </div>
      </div>

      {/* 보증금 예약 관리 목록 */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">예약 보증금 관리 대장</h2>
          <span className="text-xs text-slate-400">총 {records.length}건</span>
        </div>

        <div className="divide-y divide-slate-100">
          {records.map((rec) => {
            const scheduledDate = new Date(rec.bookingScheduledAt);
            const dateStr = `${scheduledDate.getMonth() + 1}/${scheduledDate.getDate()} ${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;

            return (
              <div
                key={rec.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-3 rounded-2xl mt-0.5 ${
                      rec.status === 'deducted_settled'
                        ? 'bg-emerald-50 text-emerald-600'
                        : rec.status === 'forfeited_noshow'
                        ? 'bg-rose-50 text-rose-600'
                        : rec.status === 'checked_in'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-sm">{rec.customerName}</span>
                      <span className="text-xs text-slate-400 font-mono">({rec.bookingId})</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          rec.status === 'checked_in'
                            ? 'bg-amber-100 text-amber-700'
                            : rec.status === 'deducted_settled'
                            ? 'bg-emerald-100 text-emerald-700'
                            : rec.status === 'forfeited_noshow'
                            ? 'bg-rose-100 text-rose-700'
                            : rec.status === 'refunded'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {rec.status === 'checked_in'
                          ? '방문/체크인'
                          : rec.status === 'deducted_settled'
                          ? '보증금 차감정산 완료'
                          : rec.status === 'forfeited_noshow'
                          ? '노쇼 몰수 (위약금)'
                          : rec.status === 'refunded'
                          ? '환불 완료'
                          : '보증금 예치 중'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>서비스: <strong>{rec.serviceName}</strong></span>
                      <span>예약일시: <strong>{dateStr}</strong></span>
                      <span>예치 보증금: <strong className="text-indigo-600">₩{rec.depositAmount.toLocaleString()}</strong></span>
                      {rec.finalPaidAmount !== undefined && (
                        <span>차감 후 실결제: <strong className="text-emerald-600">₩{rec.finalPaidAmount.toLocaleString()}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  {rec.status === 'held' && (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(rec.id)}
                      className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
                    >
                      체크인 확인
                    </button>
                  )}

                  {(rec.status === 'held' || rec.status === 'checked_in') && (
                    <button
                      type="button"
                      onClick={() => handleOpenSettle(rec)}
                      className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> 차감 정산
                    </button>
                  )}

                  {rec.status === 'held' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleForfeitNoShow(rec.id)}
                        className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                        title="노쇼 몰수"
                      >
                        노쇼 처리
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefund(rec.id)}
                        className="px-2.5 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
                        title="취소 환불"
                      >
                        환불
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 정산 결산 모달 */}
      {settlingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                현장 결제 시 보증금 자동 차감
              </h3>
              <button
                type="button"
                onClick={() => setSettlingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl text-xs">
              <div className="flex justify-between text-slate-500">
                <span>예약 고객</span>
                <strong className="text-slate-800">{settlingRecord.customerName}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>서비스 품목</span>
                <strong className="text-slate-800">{settlingRecord.serviceName}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>기납부 보증금</span>
                <strong className="text-indigo-600 font-bold">
                  - ₩{settlingRecord.depositAmount.toLocaleString()}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">총 서비스/대관 금액 (원)</label>
              <input
                type="number"
                value={actualTotalFee}
                onChange={(e) => setActualTotalFee(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* 실 결제액 산출 박스 */}
            {(() => {
              const calc = calculateFinalSettlement({
                totalServiceFee: actualTotalFee,
                depositAmount: settlingRecord.depositAmount,
              });
              return (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>최종 청구액 산식</span>
                    <span>₩{calc.totalServiceFee.toLocaleString()} - ₩{calc.depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                    <span className="text-xs font-bold text-emerald-800">현장 실납부 금액</span>
                    <span className="text-xl font-black text-emerald-600">
                      ₩{calc.netPayableAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlingRecord(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md"
              >
                차감 결제 완료 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
