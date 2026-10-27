import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  CheckCircle,
  Plus,
  Gift,
  Sparkles,
  Ticket,
  Search,
  User,
  CalendarCheck,
  CreditCard,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { resolveLoyaltyStampTemplate } from '../domain/loyaltyStampTemplate';
import { useTerminology } from '@/core/terminology';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useList } from '@refinedev/core';
import {
  stampCard,
  redeemRewardCoupon,
  recordAttendanceStamp,
  recordPurchaseStamp,
  convertRewardCouponToPass,
  createCustomerDefaultBoard,
  type StampBoard,
  type StampRewardCoupon,
  type ConvertedPassRecord,
} from '../domain/loyaltyStampEngine';

/** Web Audio API를 활용한 도장 날인 0원 경쾌한 비프음 */
function playStampSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1); // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // 오디오 차단 환경 예외 안전 무시
  }
}

export const LoyaltyStampView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type);


  const customerWord = t('customer.singular', '고객');
  const orgId = currentOrganization?.id || 'demo-org';

  // 실제 고객 목록 로드
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { query: customersQuery } = useList<any>({
    resource: 'customers',
    pagination: { mode: 'off' },
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // 스탬프 보드 & 쿠폰 상태
  const [boards, setBoards] = useState<StampBoard[]>([]);
  const [coupons, setCoupons] = useState<StampRewardCoupon[]>([]);
  const [convertedPasses, setConvertedPasses] = useState<ConvertedPassRecord[]>([]);

  useEffect(() => {
    // 초기 고객 로드
    const students = (customersQuery?.data?.data as Array<{ id: string; name: string }>) || [];
    if (students.length > 0) {
      const mapped = students.map((s) => ({ id: s.id, name: s.name }));
      setCustomers(mapped);
      setSelectedCustomerId(mapped[0].id);

      // 각 고객별 기본 보드 초기화
      const initialBoards: StampBoard[] = mapped.map((c) =>
        createCustomerDefaultBoard({
          customerId: c.id,
          customerName: c.name,
          templateType: resolveLoyaltyStampTemplate(currentOrganization?.industry_type),
        })
      );
      setBoards(initialBoards);
    } else {
      // 신규 사업장 대비 기본 데모 고객
      const fallback = [
        { id: 'cust-demo-1', name: '김민준' },
        { id: 'cust-demo-2', name: '이지은' },
      ];
      setCustomers(fallback);
      setSelectedCustomerId(fallback[0].id);
      setBoards(
        fallback.map((c) =>
          createCustomerDefaultBoard({
            customerId: c.id,
            customerName: c.name,
          })
        )
      );
    }
  }, [currentOrganization?.industry_type, customersQuery?.data?.data]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || customers[0],
    [customers, selectedCustomerId]
  );

  const activeBoard = useMemo(() => {
    if (!activeCustomer) return null;
    return boards.find((b) => b.customerId === activeCustomer.id) || null;
  }, [boards, activeCustomer]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [customers, searchTerm]);

  // 도장 1개 날인 (수동)
  const handleAddStamp = (count: number = 1) => {
    if (!activeBoard) return;
    playStampSound();

    const res = stampCard({
      board: activeBoard,
      addCount: count,
      source: 'MANUAL',
    });

    setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? res.updatedBoard : b)));

    if (res.isCompleted && res.issuedCoupon) {
      setCoupons((prev) => [res.issuedCoupon!, ...prev]);
      showToast(
        `🎉 축하합니다! 스탬프 판이 완성되어 [${res.issuedCoupon.couponName}]이 자동 발급되었습니다!`,
        'success'
      );
    } else {
      showToast(
        `도장 ${count}개가 날인되었습니다. (현재 ${res.updatedBoard.currentCount}/${res.updatedBoard.targetCount}개)`,
        'info'
      );
    }
  };

  // 출결 연동 자동 스탬프 적립
  const handleAttendanceStamp = () => {
    if (!activeBoard) return;
    playStampSound();

    const attId = `att-mock-${Date.now()}`;
    const res = recordAttendanceStamp({
      board: activeBoard,
      attendanceId: attId,
    });

    if (res.success && res.result) {
      const r = res.result;
      setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? r.updatedBoard : b)));
      if (r.isCompleted && r.issuedCoupon) {
        setCoupons((prev) => [r.issuedCoupon!, ...prev]);
        showToast(
          `🎉 [출결 연동] 판 완성! [${r.issuedCoupon.couponName}] 발급!`,
          'success'
        );
      } else {
        showToast(
          `[출결 연동] 출석 확인으로 스탬프 1개가 적립되었습니다. (${r.updatedBoard.currentCount}/${r.updatedBoard.targetCount})`,
          'success'
        );
      }
    }
  };

  // 결제 연동 자동 스탬프 적립 (5,000원당 1개)
  const handlePurchaseStamp = (amount: number = 15000) => {
    if (!activeBoard) return;
    playStampSound();

    const saleId = `sale-mock-${Date.now()}`;
    const res = recordPurchaseStamp({
      board: activeBoard,
      saleId,
      saleAmount: amount,
      unitAmountPerStamp: 5000,
    });

    if (res.success && res.result) {
      const r = res.result;
      setBoards((prev) => prev.map((b) => (b.id === activeBoard.id ? r.updatedBoard : b)));
      if (r.isCompleted && r.issuedCoupon) {
        setCoupons((prev) => [r.issuedCoupon!, ...prev]);
        showToast(
          `🎉 [결제 연동] ${amount.toLocaleString()}원 결제로 ${res.stampsCalculated}개 적립되어 판이 완성되었습니다!`,
          'success'
        );
      } else {
        showToast(
          `[결제 연동] ${amount.toLocaleString()}원 결제 확인 ➔ 스탬프 ${res.stampsCalculated}개 적립!`,
          'success'
        );
      }
    }
  };

  // 리워드 쿠폰을 passes (이용권)으로 자동 전환 연동
  const handleConvertToPass = (coupon: StampRewardCoupon) => {
    const { passRecord, updatedCoupon } = convertRewardCouponToPass({
      coupon,
      organizationId: orgId,
      validityDays: 30,
    });

    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updatedCoupon : c)));
    setConvertedPasses((prev) => [passRecord, ...prev]);

    showToast(
      `[이용권 시스템 연동 완료] [${passRecord.name}] 1회권이 ${activeCustomer?.name}님께 등록되었습니다.`,
      'success'
    );
  };

  // 쿠폰 현장 즉시 소진
  const handleRedeemCoupon = (coupon: StampRewardCoupon) => {
    const res = redeemRewardCoupon(coupon);
    if (res.success) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? res.updatedCoupon : c)));
      showToast(`[${coupon.couponName}] 현장 사용 처리가 완료되었습니다.`, 'info');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                전자 스탬프 / 칭찬 도장
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                종이 쿠폰 분실 걱정 없는 {customerWord} 맞춤형 리워드 및 이용권(Pass) 자동 발행 연동
              </p>
            </div>
          </div>
        </div>

        {/* 고객 빠른 검색/선택 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${customerWord} 검색...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-36 sm:w-44"
            />
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {filteredCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 스탬프 판 렌더링 카드 */}
      {activeBoard && (
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>ACTIVE STAMP BOARD</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{activeBoard.boardTitle}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <strong>{activeCustomer?.name}</strong>님
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  판 완성 누적:{' '}
                  <strong className="text-amber-600 font-bold">{activeBoard.completedCount}회</strong>
                </span>
              </div>
            </div>

            {/* 원터치 적립 액션 바 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddStamp(1)}
                className="px-3.5 py-2 min-h-[40px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                도장 1개 날인
              </button>

              <button
                type="button"
                onClick={handleAttendanceStamp}
                className="px-3 py-2 min-h-[40px] bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors"
                title="출석 완료 시 자동 1개 적립"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                출석 연동 적립
              </button>

              <button
                type="button"
                onClick={() => handlePurchaseStamp(15000)}
                className="px-3 py-2 min-h-[40px] bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors"
                title="15,000원 결제 시 3개 적립 (5,000원당 1개)"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                결제 연동 (+3개)
              </button>
            </div>
          </div>

          {/* 10칸/12칸 스탬프 매트릭스 그리드 */}
          <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3 max-w-4xl mx-auto py-2">
            {Array.from({ length: activeBoard.targetCount }).map((_, idx) => {
              const isStamped = idx < activeBoard.currentCount;
              const isTargetLast = idx === activeBoard.targetCount - 1;

              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center border-2 transition-all duration-300 ${
                    isStamped
                      ? 'bg-gradient-to-tr from-amber-500 to-amber-400 border-amber-600 text-white shadow-md scale-105 rotate-1'
                      : isTargetLast
                      ? 'bg-amber-50/80 border-dashed border-amber-400 text-amber-700 animate-pulse'
                      : 'bg-white border-dashed border-slate-200 text-slate-300'
                  }`}
                >
                  {isStamped ? (
                    <Award className="w-7 h-7 drop-shadow-sm" />
                  ) : isTargetLast ? (
                    <Gift className="w-6 h-6 text-amber-500" />
                  ) : (
                    <span className="text-base font-black font-mono">{idx + 1}</span>
                  )}
                  <span className="text-[10px] mt-1 font-bold">
                    {isTargetLast ? '보상' : `${idx + 1}호`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-white/90 rounded-2xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
            <span className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                완성 보상: <strong>{activeBoard.rewardTitle}</strong> (유효기간{' '}
                {activeBoard.rewardCouponValidityDays}일)
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700">
                남은 도장: {activeBoard.targetCount - activeBoard.currentCount}개
              </span>
              <div className="w-24 bg-amber-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (activeBoard.currentCount / activeBoard.targetCount) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 발급된 리워드 쿠폰 보관함 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-600" />
            <span>달성 리워드 쿠폰 보관함 ({coupons.length}개)</span>
          </h3>
          <span className="text-xs text-slate-400">
            완성된 도장 판에서 자동 발행된 보상 목록입니다.
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
            스탬프 판 목표(10개)를 달성하면 이곳에 무료 이용권 및 할인 쿠폰이 자동으로 생성됩니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coupons.map((cpn) => (
              <div
                key={cpn.id}
                className={`p-4 rounded-2xl border transition-all ${
                  cpn.isRedeemed
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-indigo-200 shadow-xs hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{cpn.couponName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      만료일: {cpn.expiresAt} {cpn.isRedeemed && '· (사용 완료)'}
                    </div>
                  </div>
                  {cpn.convertedPassId && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      이용권(Pass) 연동됨
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                  {!cpn.isRedeemed && !cpn.convertedPassId && (
                    <button
                      type="button"
                      onClick={() => handleConvertToPass(cpn)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      이용권(Pass)으로 전환 등록
                    </button>
                  )}

                  {!cpn.isRedeemed ? (
                    <button
                      type="button"
                      onClick={() => handleRedeemCoupon(cpn)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      현장 즉시 사용
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                      사용 완료
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 연동 생성된 이용권 안내 리스트 */}
        {convertedPasses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-emerald-800 mb-2">
              ✔ passes 시스템에 등록된 스탬프 보상 이용권 ({convertedPasses.length}건):
            </p>
            <div className="space-y-1.5">
              {convertedPasses.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-emerald-900">{p.name}</span>
                  <span className="text-emerald-700">잔여: {p.remaining_count}회 (유효기간: ~{p.end_date})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
