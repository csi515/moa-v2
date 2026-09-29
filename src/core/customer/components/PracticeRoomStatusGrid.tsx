import type { FC } from 'react';
import type {
  PracticeRoomRow,
  RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';
import {
  buildUnionTimeSlots,
  findSlotOccupancy,
  formatHm,
  isWithinRoomHours,
  parseHm,
} from '@/core/customer/utils/practiceRoomSlotUtils';

const STEP_MINUTES = 30;

export type PracticeRoomGridSlotPick = {
  roomId: string;
  roomName: string;
  startTime: string;
  endTime: string;
};

interface Props {
  date: string;
  rooms: PracticeRoomRow[];
  bookings: RoomReservationRow[];
  /** 빈 칸 클릭 시 (스태프 예약 등) */
  onPickFreeSlot?: (pick: PracticeRoomGridSlotPick) => void;
  /** 점유 칸 클릭 */
  onPickBusySlot?: (row: RoomReservationRow) => void;
  /** true면 고객용: 이름 마스킹·점유만 표시 */
  readOnlyOccupancy?: boolean;
  className?: string;
}

/**
 * 연습실 × 시간대 현황 타임라인 Grid (로컬 state + room_reservations)
 */
export const PracticeRoomStatusGrid: FC<Props> = ({
  date,
  rooms,
  bookings,
  onPickFreeSlot,
  onPickBusySlot,
  readOnlyOccupancy = false,
  className = '',
}) => {
  const activeRooms = rooms.filter((r) => r.is_active);
  const slots = buildUnionTimeSlots(activeRooms, STEP_MINUTES);

  if (activeRooms.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">
        등록된 연습실이 없습니다.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">운영 시간 슬롯이 없습니다.</p>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900">연습실 예약 현황</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{date} · {STEP_MINUTES}분 단위</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200" />
            가능
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 border border-indigo-200" />
            확정
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200" />
            대기
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-500 w-16 border-b border-slate-200">
                시간
              </th>
              {activeRooms.map((room) => (
                <th
                  key={room.id}
                  className="px-2 py-2 text-xs font-bold text-slate-800 border-b border-l border-slate-200 min-w-[96px]"
                >
                  {room.name}
                  <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                    {String(room.open_time).slice(0, 5)}–{String(room.close_time).slice(0, 5)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot} className="border-b border-slate-100 last:border-b-0">
                <th className="sticky left-0 z-10 bg-white px-2 py-1 text-[11px] font-mono font-bold text-slate-600 whitespace-nowrap border-r border-slate-100">
                  {slot}
                </th>
                {activeRooms.map((room) => {
                  const outside = !isWithinRoomHours(room, slot, STEP_MINUTES);
                  if (outside) {
                    return (
                      <td
                        key={room.id}
                        className="px-1 py-1 border-l border-slate-100 bg-slate-50/80"
                        aria-label="운영 외"
                      />
                    );
                  }

                  const occ = findSlotOccupancy(
                    bookings,
                    room.id,
                    date,
                    slot,
                    STEP_MINUTES
                  );

                  if (occ) {
                    const pending = occ.status === 'pending';
                    const label = readOnlyOccupancy
                      ? pending
                        ? '대기'
                        : '예약됨'
                      : occ.customers?.name || (pending ? '대기' : '확정');
                    return (
                      <td key={room.id} className="px-1 py-1 border-l border-slate-100">
                        <button
                          type="button"
                          onClick={() => onPickBusySlot?.(occ)}
                          disabled={!onPickBusySlot}
                          className={`w-full min-h-[40px] rounded-lg px-1.5 py-1 text-[10px] font-bold truncate text-left transition-colors ${
                            pending
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          } ${onPickBusySlot ? 'hover:opacity-90' : 'cursor-default'}`}
                          title={`${label} · ${occ.status}`}
                        >
                          {label}
                        </button>
                      </td>
                    );
                  }

                  const canPick = Boolean(onPickFreeSlot);
                  return (
                    <td key={room.id} className="px-1 py-1 border-l border-slate-100">
                      <button
                        type="button"
                        disabled={!canPick}
                        onClick={() =>
                          onPickFreeSlot?.({
                            roomId: room.id,
                            roomName: room.name,
                            startTime: slot,
                            endTime: formatHm(parseHm(slot) + STEP_MINUTES),
                          })
                        }
                        className={`w-full min-h-[40px] rounded-lg px-1.5 py-1 text-[10px] font-bold border transition-colors ${
                          canPick
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:border-indigo-300 hover:bg-indigo-50'
                            : 'bg-emerald-50/60 text-emerald-700/70 border-emerald-50 cursor-default'
                        }`}
                      >
                        {canPick ? '예약' : '가능'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
