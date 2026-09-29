import React from 'react';
import type { ServiceOffering } from '@/core/types/schedule';
import type { SlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { Modal } from '@/shared/components';

type Party = { id: string; name: string };
type Room = { id: string; name: string };

export interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  skin: boolean;
  isScoped: boolean;
  staffLabel: string;
  customerLabel: string;
  serviceLabel: string;
  accentBtn: string;
  instructors: Party[];
  members: Party[];
  memberRemainingLabel: (memberId: string) => string;
  memberRemaining: number | null;
  services: ServiceOffering[];
  treatmentRooms: Room[];
  formStaffId: string;
  onFormStaffIdChange: (id: string) => void;
  resolvedFormStaffId: string;
  memberId: string;
  onMemberIdChange: (id: string) => void;
  serviceId: string;
  onServiceIdChange: (id: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  time: string;
  onTimeChange: (v: string) => void;
  slotCapacity: string;
  onSlotCapacityChange: (v: string) => void;
  roomId: string;
  onRoomIdChange: (id: string) => void;
  skinCondition: string;
  onSkinConditionChange: (v: string) => void;
  chartNote: string;
  onChartNoteChange: (v: string) => void;
  selectedService: ServiceOffering | undefined;
  draftCapacity: SlotCapacityInfo | null | undefined;
  onSaveCapacityOnly: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** 새 예약 등록 모달 — 입력 UI만 담당 */
export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  skin,
  isScoped,
  staffLabel,
  customerLabel,
  serviceLabel,
  accentBtn,
  instructors,
  members,
  memberRemainingLabel,
  memberRemaining,
  services,
  treatmentRooms,
  formStaffId,
  onFormStaffIdChange,
  resolvedFormStaffId,
  memberId,
  onMemberIdChange,
  serviceId,
  onServiceIdChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  slotCapacity,
  onSlotCapacityChange,
  roomId,
  onRoomIdChange,
  skinCondition,
  onSkinConditionChange,
  chartNote,
  onChartNoteChange,
  selectedService,
  draftCapacity,
  onSaveCapacityOnly,
  onSubmit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 예약 등록">
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{staffLabel} *</label>
          {isScoped ? (
            <p className="text-sm text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] flex items-center">
              {instructors.find((i) => i.id === formStaffId)?.name || '본인'}
            </p>
          ) : (
            <select
              required
              value={formStaffId}
              onChange={(e) => onFormStaffIdChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            >
              <option value="">선택</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-[11px] text-slate-500 mt-1">
            {staffLabel}마다 같은 시간도 따로 모집·정원 관리됩니다
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{customerLabel} *</label>
          <select
            required
            value={memberId}
            onChange={(e) => onMemberIdChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
          >
            <option value="">선택</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {memberRemainingLabel(m.id)}
              </option>
            ))}
          </select>
          {memberRemaining !== null && (
            <p className="text-[11px] text-slate-500 mt-1">
              선택 {customerLabel} {skin ? '관리권' : '이용권'} 잔여 {memberRemaining}회
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{serviceLabel} *</label>
          <select
            required
            value={serviceId}
            onChange={(e) => onServiceIdChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
          >
            <option value="">선택</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes}분 · 정원 {s.maxCapacity})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">날짜 *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">시간 *</label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            />
          </div>
        </div>
        {!skin && selectedService && resolvedFormStaffId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">이 시간대 정원</label>
            <input
              type="number"
              min={1}
              value={slotCapacity}
              onChange={(e) => onSlotCapacityChange(e.target.value)}
              aria-label="이 시간대 정원"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              수업 종류 기본 정원은 {selectedService.maxCapacity}명입니다. 회원이 없어도 저장할 수
              있습니다.
            </p>
            <button
              type="button"
              onClick={onSaveCapacityOnly}
              className="mt-2 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl min-h-[44px]"
            >
              정원만 저장
            </button>
          </div>
        )}
        {draftCapacity && (
          <p
            className={`text-xs font-bold ${
              draftCapacity.isClosed ? 'text-rose-600' : 'text-teal-700'
            }`}
          >
            {instructors.find((i) => i.id === resolvedFormStaffId)?.name || staffLabel} 슬롯{' '}
            {draftCapacity.occupied}/{draftCapacity.maxCapacity}명
            {draftCapacity.isClosed
              ? draftCapacity.closedManually
                ? ' · 모집 마감'
                : ' · 정원 마감 (등록 불가)'
              : ` · 잔여 ${draftCapacity.remaining}자리`}
          </p>
        )}
        {!resolvedFormStaffId && (
          <p className="text-xs font-bold text-amber-600">
            {staffLabel}를 선택하면 해당 {staffLabel} 정원을 확인할 수 있습니다
          </p>
        )}
        {skin && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">관리실</label>
              <select
                value={roomId}
                onChange={(e) => onRoomIdChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              >
                <option value="">미지정</option>
                {treatmentRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">피부 상태</label>
              <input
                value={skinCondition}
                onChange={(e) => onSkinConditionChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">시술 메모</label>
              <textarea
                value={chartNote}
                onChange={(e) => onChartNoteChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={Boolean(draftCapacity?.isClosed) || !resolvedFormStaffId}
          className={`w-full py-2.5 ${accentBtn} disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm min-h-[44px]`}
        >
          등록
        </button>
      </form>
    </Modal>
  );
};
