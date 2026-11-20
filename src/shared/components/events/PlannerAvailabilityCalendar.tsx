import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Coins,
  Sparkles,
} from 'lucide-react';
import type {
  PlannerScheduleSlot,
  VenueIntroductionProfile,
  FirstBirthdayEventPlan,
} from '@/types/firstBirthdayPlanning';
import { FirstBirthdayEventDetailModal } from './FirstBirthdayEventDetailModal';

interface PlannerAvailabilityCalendarProps {
  venue: VenueIntroductionProfile;
  slots: PlannerScheduleSlot[];
  events: FirstBirthdayEventPlan[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRequestBooking?: (slot: PlannerScheduleSlot) => void;
  onUpdateEvent?: (updated: FirstBirthdayEventPlan) => void;
}

export const PlannerAvailabilityCalendar: React.FC<PlannerAvailabilityCalendarProps> = ({
  venue,
  slots,
  events,
  selectedDate,
  onDateChange,
  onRequestBooking,
  onUpdateEvent,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<FirstBirthdayEventPlan | null>(null);

  const handleSlotClick = (slot: PlannerScheduleSlot) => {
    if (slot.status === 'BOOKED' && slot.eventSummary) {
      // 예약된 일정 클릭 시 상세 모달 오픈
      const fullEvent = events.find((ev) => ev.id === slot.eventSummary?.eventId);
      if (fullEvent) {
        setSelectedEvent(fullEvent);
      }
    } else if (slot.status === 'AVAILABLE' && onRequestBooking) {
      // 빈 일정 클릭 시 예약 문의/상담 트리거
      onRequestBooking(slot);
    }
  };

  // 홀별로 슬롯 그룹핑
  const hallGroups = venue.halls.map((hall) => ({
    hall,
    slots: slots.filter((s) => s.roomId === hall.id),
  }));

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4">
      {/* 캘린더 상단 헤더: 날짜 선택 및 요약 */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">
              {venue.venueName} 타임슬롯 일정표
            </h3>
            <span className="text-xs text-slate-500">
              (총 {venue.halls.length}개 홀 / {venue.operatingSlots.length}부제 운영)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrevDay} aria-label="이전 날짜">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs font-semibold border rounded-lg px-3 py-1.5 text-slate-700 bg-white"
            />
            <Button size="sm" variant="outline" onClick={handleNextDay} aria-label="다음 날짜">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 홀별 타임슬롯 현황 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hallGroups.map(({ hall, slots: hallSlots }) => (
          <Card key={hall.id} className="p-4 border-slate-200 space-y-3">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{hall.name}</h4>
                <p className="text-[11px] text-slate-500">
                  수용 {hall.capacity}석 / 최소보증 {hall.minGuaranteed}명
                </p>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                {hallSlots.filter((s) => s.status === 'AVAILABLE').length}타임 가능
              </span>
            </div>

            {/* 타임슬롯 리스트 */}
            <div className="space-y-2">
              {hallSlots.map((slot) => {
                const isBooked = slot.status === 'BOOKED';

                return (
                  <div
                    key={slot.slotId}
                    onClick={() => handleSlotClick(slot)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isBooked
                        ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                        : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {slot.timeSlotLabel}
                      </span>
                      <Badge variant={isBooked ? 'warning' : 'success'}>
                        {isBooked ? (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-amber-600" /> 예약 확정
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 예약 가능
                          </span>
                        )}
                      </Badge>
                    </div>

                    {/* 1. 세팅 및 철수 버퍼 시간 시각화 */}
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 bg-white/60 px-2 py-1 rounded border border-slate-200/50 my-1">
                      <span className="text-indigo-700 font-semibold flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> 세팅: {slot.setupStartTime || '10:30'}부터
                      </span>
                      <span>|</span>
                      <span>철수: {slot.teardownEndTime || '14:30'}까지</span>
                    </div>

                    {isBooked && slot.eventSummary ? (
                      <div className="text-[11px] text-slate-700 mt-2 pt-2 border-t border-amber-100 space-y-1.5">
                        <div className="flex justify-between font-semibold">
                          <span>🎂 {slot.eventSummary.babyName} 아기 첫돌</span>
                          <span className="text-slate-500">
                            보증 {slot.eventSummary.guaranteedGuests}명 (예상 {slot.eventSummary.expectedGuests}명)
                          </span>
                        </div>
                        <p className="text-slate-600 truncate">{slot.eventSummary.programSummary}</p>

                        {/* 담당 플래너 및 귀속 수수료 뱃지 시각화 */}
                        <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 text-[10px]">
                          <span className="flex items-center gap-1 text-slate-700 font-medium truncate">
                            <UserCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                            {slot.eventSummary.plannerName
                              ? `${slot.eventSummary.plannerName} (${slot.eventSummary.plannerId || '미등록'})`
                              : '플래너 미배정'}
                          </span>
                          {slot.eventSummary.commissionAmount !== undefined && (
                            <span className="font-bold text-indigo-700 flex items-center gap-0.5 shrink-0">
                              <Coins className="w-3 h-3" />
                              ₩{slot.eventSummary.commissionAmount.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-indigo-600 font-medium">
                          👉 클릭하여 플래너 배정 및 식순 상세 열람
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 mt-1 flex justify-between items-center">
                        <span>비어있는 일정입니다.</span>
                        <span className="font-semibold text-emerald-800 underline">예약 접수하기</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* 예약 상세 모달 (플래너 및 스태프 공통 열람 및 저장 지원) */}
      {selectedEvent && (
        <FirstBirthdayEventDetailModal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          venueRules={venue.venueRules}
          onSave={onUpdateEvent}
          readOnly={false}
        />
      )}
    </div>
  );
};
