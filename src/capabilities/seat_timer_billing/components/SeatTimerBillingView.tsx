import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Hourglass,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  Play,
  Square,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  calculateSeatTimerBilling,
  summarizeSeatTimerBoard,
  type SeatTimerSlot,
  type SeatTimerStatus,
} from '../domain/seatTimerBillingEngine';

const STORAGE_KEY_SEAT_TIMERS = 'moa_seat_timer_slots_data';

const DEFAULT_SLOTS: SeatTimerSlot[] = [
  {
    id: 'slot-1',
    slotNumber: '1인 몰입석 01',
    spaceType: 'study_desk',
    status: 'OCCUPIED',
    assignedUser: { name: '이현우', phone: '010-9921-3321' },
    startTime: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40분 전 입실
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  },
  {
    id: 'slot-2',
    slotNumber: '1인 몰입석 02',
    spaceType: 'study_desk',
    status: 'OCCUPIED',
    assignedUser: { name: '박지영', phone: '010-8842-1209' },
    startTime: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // 75분 전 입실 (15분 초과!)
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  },
  {
    id: 'slot-3',
    slotNumber: '스터디룸 A (4인실)',
    spaceType: 'meeting_room',
    status: 'OCCUPIED',
    assignedUser: { name: '최서준', phone: '010-3321-7788' },
    startTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(), // 110분 전
    allocatedMinutes: 120,
    baseRatePerHour: 10000,
    overdueRatePer10Min: 2000,
  },
  {
    id: 'slot-4',
    slotNumber: '1인 몰입석 03',
    spaceType: 'study_desk',
    status: 'AVAILABLE',
    allocatedMinutes: 60,
    baseRatePerHour: 3000,
    overdueRatePer10Min: 1000,
  },
  {
    id: 'slot-5',
    slotNumber: '골프 타석 01',
    spaceType: 'golf_bay',
    status: 'CLEANING',
    allocatedMinutes: 60,
    baseRatePerHour: 20000,
    overdueRatePer10Min: 5000,
  },
  {
    id: 'slot-6',
    slotNumber: '골프 타석 02',
    spaceType: 'golf_bay',
    status: 'AVAILABLE',
    allocatedMinutes: 60,
    baseRatePerHour: 20000,
    overdueRatePer10Min: 5000,
  },
];

export const SeatTimerBillingView: React.FC = () => {
  const [slots, setSlots] = useState<SeatTimerSlot[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_SEAT_TIMERS));
      return saved ? JSON.parse(saved) : DEFAULT_SLOTS;
    } catch {
      return DEFAULT_SLOTS;
    }
  });

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => new Date().toISOString());

  // 1초마다 시계 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantStorageKey(STORAGE_KEY_SEAT_TIMERS), JSON.stringify(slots));
    } catch {}
  }, [slots]);

  const summary = useMemo(() => {
    return summarizeSeatTimerBoard(slots, currentTimeStr);
  }, [slots, currentTimeStr]);

  const handleCheckOut = (slot: SeatTimerSlot) => {
    const billing = calculateSeatTimerBilling(slot, currentTimeStr);
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slot.id) {
          return {
            ...s,
            status: 'CLEANING',
            assignedUser: undefined,
            startTime: undefined,
          };
        }
        return s;
      })
    );
    showToast(
      `[${slot.slotNumber}] 퇴실 정산 완료: 총 이용요금 ${billing.totalFee.toLocaleString()}원 (초과과금 ${billing.overdueFee.toLocaleString()}원 포함)`,
      'success'
    );
  };

  const handleFinishCleaning = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          return { ...s, status: 'AVAILABLE' };
        }
        return s;
      })
    );
    showToast('청소/소독 완료! 즉시 입실 가능 상태로 전환되었습니다.', 'info');
  };

  const handleQuickCheckIn = (slot: SeatTimerSlot) => {
    const name = prompt('입실할 고객 성함을 입력해주세요:', '방문 고객');
    if (!name) return;

    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slot.id) {
          return {
            ...s,
            status: 'OCCUPIED',
            assignedUser: { name, phone: '010-0000-0000' },
            startTime: new Date().toISOString(),
          };
        }
        return s;
      })
    );
    showToast(`[${slot.slotNumber}] ${name}님 입실 체크인 되었습니다. 타이머가 시작됩니다.`, 'success');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Hourglass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              시간제 공간 타이머 & 초과요금 자동 과금
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            좌석·룸·타석의 실시간 이용시간을 초 단위로 추적하고, 시간 초과 시 10분 단위 할증 요금을 자동 과금합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border">
          <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>현장 실시간 동기화 중 ({new Date(currentTimeStr).toLocaleTimeString()})</span>
        </div>
      </div>

      {/* 상단 메트릭 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">이용 중인 좌석</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.occupiedSlots}석</div>
          <span className="text-xs text-slate-400">가동률 {summary.utilizationRatePercent}%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/40 shadow-sm">
          <span className="text-xs text-red-600 font-bold block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            시간 초과 (과금 중)
          </span>
          <div className="text-2xl font-black text-red-700 mt-1">{summary.overdueSlots}석</div>
          <span className="text-xs text-red-600">초과요금 실시간 가산 중</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">즉시 입실 가능</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.availableSlots}석</div>
          <span className="text-xs text-slate-400">대기 없이 배정 가능</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">퇴실 청소 대기</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary.cleaningSlots}석</div>
          <span className="text-xs text-slate-400">소독 및 정리 중</span>
        </div>
      </div>

      {/* 좌석 타일 그리드 콘솔 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const billing = calculateSeatTimerBilling(slot, currentTimeStr);
          const isOverdue = billing.status === 'OVERDUE';
          const isOccupied = slot.status === 'OCCUPIED' || isOverdue;

          return (
            <div
              key={slot.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col justify-between ${
                isOverdue
                  ? 'border-red-400 bg-red-50/30 ring-2 ring-red-200'
                  : isOccupied
                  ? 'border-blue-300'
                  : slot.status === 'CLEANING'
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div>
                {/* 상단 뱃지 & 좌석명 */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-slate-900">{slot.slotNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      isOverdue
                        ? 'bg-red-100 text-red-700 animate-pulse'
                        : isOccupied
                        ? 'bg-blue-100 text-blue-700'
                        : slot.status === 'CLEANING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isOverdue
                      ? `⚠️ 초과 ${billing.overdueMinutes}분`
                      : isOccupied
                      ? `이용 중 (잔여 ${billing.remainingMinutes}분)`
                      : slot.status === 'CLEANING'
                      ? '청소 대기'
                      : '입실 가능'}
                  </span>
                </div>

                {/* 이용자 정보 또는 빈자리 안내 */}
                {isOccupied && slot.assignedUser ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>이용자:</span>
                      <span className="font-semibold text-slate-900">{slot.assignedUser.name}</span>
                    </div>

                    {/* 카운트다운 타이머 바 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>경과: {billing.elapsedMinutes}분</span>
                        <span>기본: {slot.allocatedMinutes}분</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${
                            isOverdue ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (billing.elapsedMinutes / slot.allocatedMinutes) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* 요금 안내 */}
                    <div className="pt-2 border-t mt-2 flex items-center justify-between">
                      <span className="text-slate-500">현재 누적 요금</span>
                      <div className="text-right">
                        <span className="text-base font-bold text-slate-900">
                          {billing.totalFee.toLocaleString()}원
                        </span>
                        {billing.overdueFee > 0 && (
                          <span className="text-[11px] text-red-600 block">
                            (초과 +{billing.overdueFee.toLocaleString()}원)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : slot.status === 'CLEANING' ? (
                  <div className="py-6 text-center text-xs text-amber-700 space-y-2">
                    <Sparkles className="w-6 h-6 mx-auto opacity-70" />
                    <p>퇴실 완료 후 소독/정리 중입니다.</p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                    <Users className="w-6 h-6 mx-auto opacity-40" />
                    <p>기본요금 {slot.baseRatePerHour.toLocaleString()}원/시간</p>
                  </div>
                )}
              </div>

              {/* 하단 액션 버튼 */}
              <div className="pt-3 border-t mt-3">
                {isOccupied ? (
                  <button
                    onClick={() => handleCheckOut(slot)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    퇴실 & 요금 정산 ({billing.totalFee.toLocaleString()}원)
                  </button>
                ) : slot.status === 'CLEANING' ? (
                  <button
                    onClick={() => handleFinishCleaning(slot.id)}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    청소 완료 (입실 가능 전환)
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuickCheckIn(slot)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    원터치 입실 체크인
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
