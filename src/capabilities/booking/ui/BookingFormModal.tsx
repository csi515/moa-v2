import React from 'react';
import type { ServiceOffering } from '@/core/types/schedule';
import type { SlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { Modal } from '@/shared/components';
import { useAsyncLock } from '@/shared/hooks';

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
  turnaroundBufferMinutes?: number;
  visibility?: 'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE';
  onVisibilityChange?: (v: 'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE') => void;
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
  turnaroundBufferMinutes,
  visibility = 'PUBLIC',
  onVisibilityChange,
  onSaveCapacityOnly,
  onSubmit,
}) => {
  const { isLocked, runWithLock } = useAsyncLock({ cooldownMs: 500 });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runWithLock(async () => {
      await onSubmit(e);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="새 예약 등록">
      <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
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
        {turnaroundBufferMinutes !== undefined && turnaroundBufferMinutes > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <span className="font-semibold">🧹 공간 정비·청소 버퍼: {turnaroundBufferMinutes}분</span>
            <span className="text-[11px] text-amber-700">이전/다음 예약 사이에 자동 확보됩니다</span>
          </div>
        )}
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
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            동료 직원 일정 공개 범위 (Visibility)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onVisibilityChange?.('PUBLIC')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                visibility === 'PUBLIC'
                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">전체 공개</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">상세 정보 공유</div>
            </button>
            <button
              type="button"
              onClick={() => onVisibilityChange?.('FREE_BUSY_ONLY')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                visibility === 'FREE_BUSY_ONLY'
                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">바쁨만 공유</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">고객/메모 마스킹</div>
            </button>
            <button
              type="button"
              onClick={() => onVisibilityChange?.('PRIVATE')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                visibility === 'PRIVATE'
                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-1 ring-indigo-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">비공개</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">타 직원에게 숨김</div>
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={Boolean(draftCapacity?.isClosed) || !resolvedFormStaffId || isLocked}
          className={`w-full py-2.5 ${accentBtn} disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm min-h-[44px]`}
        >
          등록
        </button>
      </form>
    </Modal>
  );
};
