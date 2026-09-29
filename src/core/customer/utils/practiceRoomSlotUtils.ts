import {
  seoulDateFromIso,
  seoulTimeFromIso,
  type PracticeRoomRow,
  type RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';

export function parseHm(t: string): number {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 운영 시간 기준 슬롯 (기본 30분) */
export function buildTimeSlots(
  openTime: string,
  closeTime: string,
  stepMinutes = 30
): string[] {
  const open = parseHm(openTime);
  const close = parseHm(closeTime);
  const slots: string[] = [];
  for (let t = open; t + stepMinutes <= close; t += stepMinutes) {
    slots.push(formatHm(t));
  }
  return slots;
}

/** 여러 연습실의 공통 슬롯 (가장 이른 open ~ 가장 늦은 close) */
export function buildUnionTimeSlots(rooms: PracticeRoomRow[], stepMinutes = 30): string[] {
  if (rooms.length === 0) return [];
  let open = Number.POSITIVE_INFINITY;
  let close = 0;
  for (const room of rooms) {
    open = Math.min(open, parseHm(String(room.open_time)));
    close = Math.max(close, parseHm(String(room.close_time)));
  }
  if (!Number.isFinite(open) || close <= open) return [];
  return buildTimeSlots(formatHm(open), formatHm(close), stepMinutes);
}

export function reservationOverlapsSlot(
  reservation: RoomReservationRow,
  date: string,
  slotStart: string,
  stepMinutes = 30
): boolean {
  if (seoulDateFromIso(reservation.starts_at) !== date) return false;
  const slotStartM = parseHm(slotStart);
  const slotEndM = slotStartM + stepMinutes;
  const resStart = parseHm(seoulTimeFromIso(reservation.starts_at));
  const resEnd = parseHm(seoulTimeFromIso(reservation.ends_at));
  return resStart < slotEndM && resEnd > slotStartM;
}

export function findSlotOccupancy(
  bookings: RoomReservationRow[],
  roomId: string,
  date: string,
  slotStart: string,
  stepMinutes = 30
): RoomReservationRow | null {
  return (
    bookings.find(
      (b) =>
        b.room_id === roomId &&
        (b.status === 'pending' || b.status === 'approved') &&
        reservationOverlapsSlot(b, date, slotStart, stepMinutes)
    ) ?? null
  );
}

export function isWithinRoomHours(
  room: PracticeRoomRow,
  slotStart: string,
  stepMinutes = 30
): boolean {
  const open = parseHm(String(room.open_time));
  const close = parseHm(String(room.close_time));
  const start = parseHm(slotStart);
  return start >= open && start + stepMinutes <= close;
}
