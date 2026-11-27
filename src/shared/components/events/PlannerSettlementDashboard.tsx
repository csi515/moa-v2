import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  Coins,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  Gift,
  Wallet,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import type {
  FirstBirthdayEventPlan,
  VenueIntroductionProfile,
  CommissionSettlementStatus,
} from '@/types/firstBirthdayPlanning';
import {
  calculatePlannerSettlementSummary,
  calculateEventDDay,
  calculateEstimatedSettlementDate,
  formatPlannerWalletBadgeText,
} from '@/shared/services/firstBirthdayPlanningService';

interface PlannerSettlementDashboardProps {
  plannerId: string;
  events: FirstBirthdayEventPlan[];
  venues: VenueIntroductionProfile[];
}

export const PlannerSettlementDashboard: React.FC<PlannerSettlementDashboardProps> = ({
  plannerId,
  events,
  venues,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | CommissionSettlementStatus>('ALL');

  // 본인 ID로 귀속된 예약 건 필터링
  const myEvents = (events || []).filter(
    (ev) => ev.plannerId === plannerId && ev.status !== 'CANCELLED'
  );

  const summary = calculatePlannerSettlementSummary(plannerId, events);

  const filteredList =
    statusFilter === 'ALL'
      ? myEvents
      : myEvents.filter((ev) => (ev.settlementStatus || 'PENDING_EVENT') === statusFilter);

  const getVenueName = (venueId: string) => {
    const found = venues.find((v) => v.venueId === venueId);
    return found ? found.venueName : '제휴 베뉴';
  };

  return (
    <div className="space-y-6">
      {/* 🏆 업계 표준 원칙 배너 & 내 지갑 총 누적 수수료 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800/40 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                🏆 업계 표준
              </span>
              <span className="text-xs font-semibold text-slate-400">
                「D-Day 행사 완료 후 익월 정산」 원칙 적용
              </span>
            </div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Wallet className="w-6 h-6 text-amber-400" /> 플래너 적립 지갑 & 정산 현황
            </h3>
            <p className="text-slate-300 text-xs">
              플래너 ID: <span className="font-mono font-bold text-amber-300">{plannerId}</span> 에
              안전하게 확보된 수수료 자산입니다. 고객 잔금 완납 및 행사 완료 시 익월 자동 입금됩니다.
            </p>
          </div>

          <div className="text-right bg-white/10 px-5 py-3 rounded-xl backdrop-blur-md border border-white/10 shrink-0">
            <span className="text-[11px] text-slate-300 block font-medium">총 확보 성사 수수료 (누적)</span>
            <span className="text-2xl font-black text-amber-300">
              ₩{summary.totalCommissionAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 플래너 심리 안정 가이드라인 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            성사된 예약 건의 수수료는 취소되지 않는 한 플래너님의 지갑에 안전하게 <strong>[확정 예정]</strong>으로
            보관되며, D-Day 카운트다운 완료 후 익월 10일에 지정 계좌로 정산 지급됩니다.
          </span>
        </div>
      </div>

      {/* 요약 메트릭 카드 4종 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 space-y-1">
          <span className="text-xs text-slate-500 font-medium">총 성사 예약 건수</span>
          <div className="text-2xl font-bold text-slate-800">
            {summary.totalBookingsCount}
            <span className="text-xs font-normal text-slate-500 ml-1">건</span>
          </div>
          <span className="text-[11px] text-slate-400 block">정상 진행 예약 건</span>
        </Card>

        {/* 핵심: D-Day 디데이 카운트다운과 함께 내 지갑에 적립된 시각적 만족감 */}
        <Card className="p-4 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/60 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> 확정 예정 수수료
            </span>
            <Badge variant="warning">{summary.pendingEventCount}건</Badge>
          </div>
          <div className="text-xl font-black text-amber-950">
            ₩{summary.pendingEventAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-800 font-medium block">
            {summary.averageDaysUntilEvent
              ? `평균 D-${summary.averageDaysUntilEvent} 후 익월 정산 전환`
              : 'D-Day 행사 완료 시 자동 정산'}
          </span>
        </Card>

        <Card className="p-4 border-slate-200 bg-slate-50/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-800 font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-slate-800" /> 정산 승인 대기
            </span>
            <Badge variant="brand">{summary.readyToSettleCount}건</Badge>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            ₩{summary.readyToSettleAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-700 block">행사 완료 (익월 10일 입금)</span>
        </Card>

        <Card className="p-4 border-emerald-200 bg-emerald-50/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 정산 지급 완료
            </span>
            <Badge variant="success">{summary.settledCount}건</Badge>
          </div>
          <div className="text-xl font-extrabold text-emerald-900">
            ₩{summary.settledAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700 block">지급 완료된 총 수수료</span>
        </Card>
      </div>

      {/* 실적 상세 목록 */}
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <span>내 귀속 예약 & D-Day 적립 현황 ({filteredList.length}건)</span>
          </h4>

          {/* 상태 필터 탭 */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {(
              [
                { key: 'ALL', label: '전체' },
                { key: 'PENDING_EVENT', label: 'D-Day 대기' },
                { key: 'READY_TO_SETTLE', label: '정산대기' },
                { key: 'SETTLED', label: '지급완료' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs border border-dashed rounded-lg">
            해당 조건의 귀속 예약 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((event) => {
              const base = event.commissionAmount || 0;
              const bonus = event.commissionBonusAmount || 0;
              const total = base + bonus;
              const walletInfo = formatPlannerWalletBadgeText(event);
              const dday = calculateEventDDay(event.eventDate);
              const estimatedPayDate = calculateEstimatedSettlementDate(event.eventDate);
              const isPending = (event.settlementStatus || 'PENDING_EVENT') === 'PENDING_EVENT';

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm space-y-3"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* [확정 예정 수수료 ₩150,000 (D-45)] 뱃지 시각화 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {event.title} ({event.babyName} 아기 첫돌)
                        </span>

                        {isPending ? (
                          <span className="bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            확정 예정 수수료 ₩{total.toLocaleString()} ({dday.label})
                          </span>
                        ) : event.settlementStatus === 'READY_TO_SETTLE' ? (
                          <Badge variant="brand">정산 승인 대기 ({estimatedPayDate} 입금 예정)</Badge>
                        ) : (
                          <Badge variant="success">지급 완료</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-700" />
                          {getVenueName(event.venueId)} ({event.roomName})
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {event.eventDate} {event.timeSlot}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          보증 {event.guaranteedGuests}명 (예상 {event.expectedGuests}명)
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-slate-700">
                        ₩{total.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                        <span>기본 ₩{base.toLocaleString()}</span>
                        {bonus > 0 && (
                          <span className="text-amber-600 font-semibold flex items-center">
                            <Gift className="w-3 h-3 inline mr-0.5" />
                            +보너스 ₩{bonus.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 정산 타임라인 3단계 프로그레스 바 (플래너 시각적 안도감 제공) */}
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 1. 예약 성사 (확정)
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <div
                        className={`flex items-center gap-1 ${
                          isPending ? 'text-amber-800 font-bold' : 'text-emerald-700 font-bold'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" /> 2. D-Day 행사 완료 ({dday.label})
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <div
                        className={`flex items-center gap-1 ${
                          event.settlementStatus === 'SETTLED'
                            ? 'text-emerald-700 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> 3. 익월 10일 정산 ({estimatedPayDate})
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
