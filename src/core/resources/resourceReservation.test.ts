/**
 * 공통 Resource Reservation 계층. 실행: npm run test:resource-reservation
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isBlockingReservationStatus,
  resourceRangesOverlap,
  resourceReservationsConflict,
} from './overlap';
import { mapResourceReservationError } from './reservationErrors';
import { PRACTICE_ROOM_RESOURCE_KIND } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function run() {
  assert.equal(PRACTICE_ROOM_RESOURCE_KIND, 'practice_room');
  assert.equal(isBlockingReservationStatus('pending'), true);
  assert.equal(isBlockingReservationStatus('approved'), true);
  assert.equal(isBlockingReservationStatus('cancelled'), false);
  assert.equal(isBlockingReservationStatus('rejected'), false);

  assert.equal(
    resourceRangesOverlap('2026-09-24T01:00:00Z', '2026-09-24T02:00:00Z', '2026-09-24T02:00:00Z', '2026-09-24T03:00:00Z'),
    false
  );
  assert.equal(
    resourceRangesOverlap('2026-09-24T01:00:00Z', '2026-09-24T02:00:00Z', '2026-09-24T01:30:00Z', '2026-09-24T02:30:00Z'),
    true
  );

  assert.equal(
    resourceReservationsConflict(
      { resourceId: 'r1', startsAt: '10:00', endsAt: '11:00', status: 'approved' },
      { resourceId: 'r1', startsAt: '10:30', endsAt: '11:30', status: 'pending' }
    ),
    true
  );
  assert.equal(
    resourceReservationsConflict(
      { resourceId: 'r1', startsAt: '10:00', endsAt: '11:00', status: 'approved' },
      { resourceId: 'r2', startsAt: '10:30', endsAt: '11:30', status: 'pending' }
    ),
    false
  );
  assert.equal(
    resourceReservationsConflict(
      { resourceId: 'r1', startsAt: '10:00', endsAt: '11:00', status: 'cancelled' },
      { resourceId: 'r1', startsAt: '10:30', endsAt: '11:30', status: 'approved' }
    ),
    false
  );

  assert.equal(
    mapResourceReservationError('Time slot already reserved', 'x').message,
    '이미 예약된 시간대입니다.'
  );
  assert.equal(
    mapResourceReservationError('Time slot conflicts with another reservation', 'x').message,
    '이미 예약된 시간대입니다.'
  );

  const sql = readSrc('supabase/migrations/20260924180000_bookable_resources.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS core\.bookable_resources/);
  assert.match(sql, /room_reservations_room_id_fkey/);
  assert.match(sql, /REFERENCES core\.bookable_resources/);
  assert.match(sql, /FROM core\.bookable_resources/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /book_room_reservation_guarded/);
  assert.match(sql, /status IN \('pending', 'approved'\)/);
  assert.match(sql, /exclusion_violation/);
  assert.match(sql, /upsert_bookable_resource/);
  assert.match(sql, /list_org_bookable_resources/);
  assert.doesNotMatch(sql, /sauna_jjimjilbang/);
  assert.doesNotMatch(sql, /bath\./);
  assert.doesNotMatch(sql, /scrub_station/);
  assert.doesNotMatch(sql, /massage_room/);

  const excludeSql = readSrc('supabase/migrations/20260907130000_practice_room_reservations.sql');
  assert.match(excludeSql, /room_reservations_no_overlap/);
  assert.match(excludeSql, /EXCLUDE USING gist/);

  const pianoFacade = readSrc('src/core/customer/services/practiceRoomReservationService.ts');
  assert.match(pianoFacade, /resourceReservationCapability/);
  assert.match(pianoFacade, /PRACTICE_ROOM_RESOURCE_KIND/);
  assert.doesNotMatch(pianoFacade, /getCoreClient/);
  assert.doesNotMatch(pianoFacade, /\.rpc\(/);

  const capability = readSrc('src/core/resources/resourceReservationCapability.ts');
  assert.match(capability, /create_staff_room_reservation|createStaffResourceReservation/);
  assert.doesNotMatch(capability, /sauna_jjimjilbang/);
  assert.doesNotMatch(capability, /from '@\/modules\//);

  const service = readSrc('src/core/resources/reservationService.ts');
  assert.match(service, /create_staff_room_reservation/);
  assert.match(service, /request_room_reservation/);
  assert.match(service, /bookable_resources\(name, kind\)/);
  assert.doesNotMatch(service, /from '@\/modules\//);
  assert.doesNotMatch(service, /sauna_jjimjilbang/);

  const catalog = readSrc('src/core/resources/resourceService.ts');
  assert.match(catalog, /upsert_bookable_resource/);
  assert.match(catalog, /list_org_bookable_resources/);
  assert.match(catalog, /upsert_practice_room/);

  const pianoView = readSrc('src/industries/piano/components/practiceRooms/PracticeRoomBookingView.tsx');
  assert.match(pianoView, /practiceRoomReservationService/);

  const bathDir = join(root, 'src/industries/bath');
  const bathFiles = readdirSync(bathDir, { recursive: true })
    .filter((name) => typeof name === 'string' && /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name))
    .map((name) => readSrc(`src/industries/bath/${String(name).replace(/\\/g, '/')}`))
    .join('\n');
  assert.doesNotMatch(bathFiles, /EXCLUDE USING gist/);
  assert.doesNotMatch(bathFiles, /book_room_reservation_guarded/);

  console.log('resourceReservation.test.ts: ok');
}

run();
