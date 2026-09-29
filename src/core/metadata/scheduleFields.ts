import { dualReadText } from './dualRead';

export type SchedulePromotedRow = {
  staff_id?: string | null;
  session_pass_id?: string | null;
  room?: string | null;
  room_id?: string | null;
  metadata?: unknown;
};

export function scheduleStaffId(row: SchedulePromotedRow): string | undefined {
  return dualReadText(row.staff_id, row.metadata, 'teacherId')
    ?? dualReadText(null, row.metadata, 'staffId');
}

export function scheduleSessionPassId(row: SchedulePromotedRow): string | undefined {
  return dualReadText(row.session_pass_id, row.metadata, 'sessionPassId');
}

export function scheduleRoom(row: SchedulePromotedRow): string | undefined {
  return dualReadText(row.room, row.metadata, 'room');
}

export function scheduleRoomId(row: SchedulePromotedRow): string | undefined {
  return dualReadText(row.room_id, row.metadata, 'roomId');
}

export function schedulePromotedWrite(input: {
  staffId?: string | null;
  sessionPassId?: string | null;
  room?: string | null;
  roomId?: string | null;
}): {
  staff_id: string | null;
  session_pass_id: string | null;
  room: string | null;
  room_id: string | null;
} {
  return {
    staff_id: input.staffId || null,
    session_pass_id: input.sessionPassId || null,
    room: input.room || null,
    room_id: input.roomId || null,
  };
}
