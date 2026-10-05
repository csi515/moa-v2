import React from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useTerminology } from '@/core/terminology';
import type { Booking, BookingStatus, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';
import {
  buildSlotKey,
  buildSlotOccupancyIndex,
  getSlotCapacityInfo,
  groupBookingsIntoSlots,
  type SlotBookingGroup,
} from '@/capabilities/scheduling/capacity';

export interface CapacitySlotListProps {
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

/** 정원 기반 그룹 예약 목록 — 수업/세션 헤더에 정원·마감, 아래에 참여 고객 */
export const CapacitySlotList: React.FC<CapacitySlotListProps> = ({
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
  const { t } = useTerminology();
  const customerWord = t('customer.singular', '회원');
  const staffWord = t('staff.singular', '강사');
  const serviceWord = t('service.singular', '수업');

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
      serviceName: services.find((service) => service.id === item.serviceId)?.name || serviceWord,
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
                  {group.serviceName || serviceWord} · {group.staffName || staffWord}
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
                  {group.bookings.length > 0
                    ? `참여 ${memberNames}`
                    : `아직 등록된 ${customerWord}이 없습니다`}
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
                        max={99}
                        defaultValue={capacity.maxCapacity}
                        className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-center"
                        onBlur={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next) && next >= Math.max(1, capacity.occupied)) {
                            onSetCapacity(group, next);
                          } else {
                            event.target.value = String(capacity.maxCapacity);
                            showToast(`정원은 현재 참여 ${customerWord} 수 이상이어야 합니다.`, 'warning');
                          }
                        }}
                      />
                    </label>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => onToggleClosed(group)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                        capacity.isClosed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {capacity.isClosed ? '예약 다시 받기' : '모집 마감하기'}
                    </button>
                  )}
                  {openBookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onCompleteClass(group)}
                      className="px-3 py-1 text-xs font-bold rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                    >
                      {serviceWord} 완료(전원 출석)
                    </button>
                  )}
                </div>
              )}
            </div>

            {group.bookings.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                {group.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{booking.customerName}</span>
                      <span className="ml-2 text-slate-500">
                        {BOOKING_STATUS_LABEL[booking.status] || booking.status}
                      </span>
                      {booking.memo && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{booking.memo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {booking.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'completed')}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-teal-200 text-teal-700 hover:bg-teal-50"
                        >
                          출석
                        </button>
                      )}
                      {booking.status !== 'no_show' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'no_show')}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          결석
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking, 'cancelled')}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
