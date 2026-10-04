import React from 'react';
import { useApp } from '@/context/AppContext';
import type { Booking, BookingStatus, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';
import {
  buildSlotKey,
  buildSlotOccupancyIndex,
  getSlotCapacityInfo,
  groupBookingsIntoSlots,
  type SlotBookingGroup,
} from '@/capabilities/scheduling/capacity';

interface PilatesSlotListProps {
  bookings: Booking[];
  allBookings: Booking[];
  services: ServiceOffering[];
  recruitments: SlotRecruitment[];
  presetRecruitments?: SlotRecruitment[];
  staffNameById?: Record<string, string>;
  canEditSlot: (staffId: string) => boolean;
  onSetCapacity: (group: SlotBookingGroup, next: number) => void;
  onToggleClosed: (group: SlotBookingGroup) => void;
  onUpdateStatus: (booking: Booking, status: BookingStatus) => void;
  onCompleteClass: (group: SlotBookingGroup) => void;
}

/** 필라테스 예약 목록 — 수업 헤더에 정원·마감, 아래에 참여 회원 */
export const PilatesSlotList: React.FC<PilatesSlotListProps> = ({
  bookings,
  allBookings,
  services,
  recruitments,
  presetRecruitments = [],
  staffNameById = {},
  canEditSlot,
  onSetCapacity,
  onToggleClosed,
  onUpdateStatus,
  onCompleteClass,
}) => {
  const { showToast } = useApp();
  const groups = groupBookingsIntoSlots(bookings);
  const occupancyIndex = buildSlotOccupancyIndex(allBookings);
  const bookingKeys = new Set(groups.map((group) => group.key));
  const emptyPresets: SlotBookingGroup[] = presetRecruitments
    .filter((item) => {
      if (!item.serviceId || !item.staffId || !item.maxCapacity) return false;
      return !bookingKeys.has(buildSlotKey(item.serviceId, item.staffId, item.startsAt));
    })
    .map((item) => ({
      key: buildSlotKey(item.serviceId, item.staffId, item.startsAt),
      serviceId: item.serviceId,
      staffId: item.staffId,
      startsAt: item.startsAt,
      serviceName: services.find((service) => service.id === item.serviceId)?.name || '수업',
      staffName: staffNameById[item.staffId] || '',
      endsAt: '',
      bookings: [],
    }));
  const visibleGroups = [...groups, ...emptyPresets].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => {
        const service = services.find((item) => item.id === group.serviceId);
        const capacity =
          service && group.serviceId && group.staffId
            ? getSlotCapacityInfo({
                service,
                staffId: group.staffId,
                startsAt: group.startsAt,
                bookings: allBookings,
                recruitments,
                occupancyIndex,
              })
            : null;
        const editable = Boolean(group.staffId && canEditSlot(group.staffId));
        const openBookings = group.bookings.filter(
          (booking) => booking.status === 'scheduled' || booking.status === 'confirmed'
        );
        const memberNames = group.bookings.map((booking) => booking.customerName).join(', ');

        return (
          <div key={group.key} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  {group.serviceName || '수업'} · {group.staffName || '강사'}
                </p>
                <p className="text-xs font-semibold mt-1 text-teal-700">
                  {group.startsAt.slice(0, 16).replace('T', ' ')}
                  {group.endsAt ? ` ~ ${group.endsAt.slice(11, 16)}` : ''}
                </p>
                {capacity && (
                  <p
                    className={`text-[11px] font-bold mt-1 ${
                      capacity.isClosed ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    정원 {capacity.occupied}/{capacity.maxCapacity}
                    {capacity.isClosed
                      ? capacity.closedManually
                        ? ' · 모집 마감'
                        : ' · 정원 마감'
                      : ` · 잔여 ${capacity.remaining}자리`}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {group.bookings.length > 0 ? `참여 ${memberNames}` : '아직 등록된 회원이 없습니다'}
                </p>
              </div>
              {capacity && group.serviceId && group.staffId && (
                <div className="flex flex-wrap gap-2">
                  {editable && (
                    <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                      정원
                      <input
                        key={`${group.key}-${capacity.maxCapacity}`}
                        type="number"
                        min={Math.max(1, capacity.occupied)}
                        defaultValue={capacity.maxCapacity}
                        aria-label="이 시간대 정원"
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (!next || next === capacity.maxCapacity) return;
                          if (next < capacity.occupied) {
                            showToast('현재 모인 인원보다 작게 줄일 수 없습니다.', 'warning');
                            e.target.value = String(capacity.maxCapacity);
                            return;
                          }
                          onSetCapacity(group, next);
                        }}
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px]"
                      />
                    </label>
                  )}
                  {editable && openBookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onCompleteClass(group)}
                      className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg min-h-[44px]"
                    >
                      참석 완료
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => onToggleClosed(group)}
                      className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg min-h-[44px]"
                    >
                      {capacity.closedManually ? '모집 재개' : '모집 마감'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {group.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{booking.customerName}</p>
                    {booking.memo && (
                      <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-wrap">{booking.memo}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white text-slate-700">
                      {BOOKING_STATUS_LABEL[booking.status]}
                    </span>
                    {editable && booking.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(booking, 'confirmed')}
                        className="px-2 py-1 text-xs font-bold bg-teal-600 text-white rounded-lg min-h-[44px]"
                      >
                        확정
                      </button>
                    )}
                    {editable && (booking.status === 'scheduled' || booking.status === 'confirmed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'completed')}
                          className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg min-h-[44px]"
                        >
                          완료
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'no_show')}
                          className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-lg min-h-[44px]"
                        >
                          노쇼
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'cancelled')}
                          className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                        >
                          취소
                        </button>
                      </>
                    )}
                    {editable && (booking.status === 'completed' || booking.status === 'no_show') && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(booking, 'cancelled')}
                        className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
