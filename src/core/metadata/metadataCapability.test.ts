/**
 * schedules metadata 승격 dual-read 불변식.
 * 실행: npm run test:metadata-promotion
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bookingToScheduleRow,
  scheduleRowToBooking,
} from '@/services/adapters/sync/mappers/scheduleMappers';
import { dualReadPreferred, dualReadText, promotedFieldInvariant } from './dualRead';
import { scheduleSessionPassId, scheduleStaffId } from './scheduleFields';
import { SCHEDULE_METADATA_PROMOTION } from './types';
import type { Booking } from '@/core/types/schedule';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function booking(partial: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    customerId: 'c1',
    customerName: '고객',
    staffId: 'st1',
    startsAt: '2026-09-24T10:00:00.000Z',
    endsAt: '2026-09-24T11:00:00.000Z',
    status: 'scheduled',
    sessionPassId: '11111111-1111-1111-1111-111111111111',
    roomId: 'room-1',
    roomName: 'A실',
    ...partial,
  };
}

function run() {
  assert.equal(SCHEDULE_METADATA_PROMOTION.domain, 'schedules');
  assert.equal(SCHEDULE_METADATA_PROMOTION.phase, 'dual-read');

  assert.equal(dualReadText('col', { teacherId: 'meta' }, 'teacherId'), 'col');
  assert.equal(dualReadText(null, { teacherId: 'meta' }, 'teacherId'), 'meta');
  assert.equal(dualReadText('', { teacherId: '  ' }, 'teacherId'), undefined);
  assert.equal(dualReadPreferred('col', { teacherId: 'other' }, 'teacherId').source, 'column');
  assert.equal(promotedFieldInvariant('st1', { teacherId: 'st1' }, 'teacherId'), true);
  assert.equal(promotedFieldInvariant('st1', { teacherId: 'st2' }, 'teacherId'), false);
  assert.equal(promotedFieldInvariant(null, { teacherId: 'st2' }, 'teacherId'), true);

  assert.equal(
    scheduleSessionPassId({
      session_pass_id: null,
      metadata: { sessionPassId: 'p-meta' },
    }),
    'p-meta'
  );
  assert.equal(
    scheduleSessionPassId({
      session_pass_id: 'p-col',
      metadata: { sessionPassId: 'p-meta' },
    }),
    'p-col'
  );
  assert.equal(
    scheduleStaffId({ staff_id: null, metadata: { teacherId: 't-meta' } }),
    't-meta'
  );

  const written = bookingToScheduleRow(booking(), 'org-a');
  assert.equal(written.session_pass_id, '11111111-1111-1111-1111-111111111111');
  assert.equal(written.room, 'A실');
  assert.equal(written.room_id, 'room-1');
  assert.equal(written.staff_id, 'st1');
  const meta = written.metadata as { sessionPassId?: string; room?: string };
  assert.equal(meta.sessionPassId, '11111111-1111-1111-1111-111111111111');
  assert.equal(meta.room, 'A실');

  const fromColumn = scheduleRowToBooking({
    id: 'b1',
    customer_id: 'c1',
    staff_id: 'st-col',
    service_id: null,
    starts_at: '2026-09-24T10:00:00.000Z',
    ends_at: '2026-09-24T11:00:00.000Z',
    status: 'scheduled',
    memo: null,
    metadata: { customerName: '고객', teacherId: 'st-meta', sessionPassId: 'p-meta', room: '메타실' },
    created_at: '2026-09-24T09:00:00.000Z',
    session_pass_id: 'p-col',
    room: '컬럼실',
    room_id: 'room-col',
  });
  assert.equal(fromColumn.staffId, 'st-col');
  assert.equal(fromColumn.sessionPassId, 'p-col');
  assert.equal(fromColumn.roomName, '컬럼실');
  assert.equal(fromColumn.roomId, 'room-col');

  const fromMetaOnly = scheduleRowToBooking({
    id: 'b2',
    customer_id: 'c1',
    staff_id: null,
    service_id: null,
    starts_at: '2026-09-24T10:00:00.000Z',
    ends_at: '2026-09-24T11:00:00.000Z',
    status: 'scheduled',
    memo: null,
    metadata: { customerName: '고객', teacherId: 'st-meta', sessionPassId: 'p-meta', room: '메타실' },
    created_at: '2026-09-24T09:00:00.000Z',
  });
  assert.equal(fromMetaOnly.staffId, 'st-meta');
  assert.equal(fromMetaOnly.sessionPassId, 'p-meta');
  assert.equal(fromMetaOnly.roomName, '메타실');

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924330000_schedule_metadata_promotion.sql'),
    'utf8'
  );
  assert.match(sql, /ADD COLUMN IF NOT EXISTS session_pass_id/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS room TEXT/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS room_id TEXT/);
  assert.match(sql, /core\.schedule_session_pass_id/);
  assert.match(sql, /core\.schedule_teacher_ref/);
  assert.match(sql, /metadata->>'sessionPassId'/);
  assert.match(sql, /metadata->>'teacherId'/);
  assert.match(sql, /metadata->>'room'/);
  assert.match(sql, /session_pass_id = v_pass_id/);
  assert.match(sql, /jsonb_set\(v_meta, '\{sessionPassId\}'/);
  assert.doesNotMatch(sql, /ALTER TABLE core\.(customers|services|payments)/);
  assert.doesNotMatch(sql, /DROP COLUMN metadata/);

  console.log('metadataCapability.test.ts: ok');
}

run();
