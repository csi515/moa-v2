/**
 * 공통 Resource Capability. 실행: npm run test:resource
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canReserveResource, isKnownResourceKind, isResourceSlotAllowed } from './resourcePolicy';
import { toResource } from './resourceMappers';
import { RESOURCE_KINDS } from './types';
import type { BookableResource } from './types';
import { resourceRangesOverlap, resourceReservationsConflict } from './overlap';
import { mapResourceReservationError } from './reservationErrors';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function run() {
  assert.deepEqual([...RESOURCE_KINDS], ['room', 'station', 'equipment', 'seat', 'facility']);
  assert.equal(isKnownResourceKind('room'), true);
  assert.equal(isKnownResourceKind('station'), true);
  assert.equal(isKnownResourceKind('practice_room'), false);

  const row: BookableResource = {
    id: 'res-1',
    organization_id: 'org-1',
    kind: 'room',
    name: '1번 룸',
    capacity: 2,
    open_time: '09:00:00',
    close_time: '21:00:00',
    is_active: true,
    memo: null,
    metadata: {},
    created_at: '2026-09-24T00:00:00.000Z',
    updated_at: '2026-09-24T00:00:00.000Z',
  };
  const resource = toResource(row);
  assert.equal(resource.organizationId, 'org-1');
  assert.equal(resource.active, true);
  assert.equal(resource.openTime, '09:00:00');
  assert.equal(canReserveResource(resource), true);
  assert.equal(canReserveResource({ active: false }), false);

  assert.equal(
    isResourceSlotAllowed(resource, '2026-09-24T10:00:00', '2026-09-24T11:00:00'),
    true
  );
  assert.equal(
    isResourceSlotAllowed(resource, '2026-09-24T21:00:00', '2026-09-24T22:00:00'),
    false
  );
  assert.equal(
    isResourceSlotAllowed({ ...resource, active: false }, '2026-09-24T10:00:00', '2026-09-24T11:00:00'),
    false
  );

  assert.equal(
    resourceRangesOverlap(
      '2026-09-24T10:00:00Z',
      '2026-09-24T11:00:00Z',
      '2026-09-24T10:30:00Z',
      '2026-09-24T11:30:00Z'
    ),
    true
  );
  assert.equal(
    resourceReservationsConflict(
      { resourceId: 'res-1', startsAt: '10:00', endsAt: '11:00', status: 'approved' },
      { resourceId: 'res-1', startsAt: '10:30', endsAt: '11:30', status: 'pending' }
    ),
    true
  );
  assert.equal(
    resourceReservationsConflict(
      { resourceId: 'res-1', startsAt: '10:00', endsAt: '11:00', status: 'approved' },
      { resourceId: 'res-2', startsAt: '10:30', endsAt: '11:30', status: 'pending' }
    ),
    false
  );

  assert.equal(
    mapResourceReservationError('Practice room not found or inactive', 'x').message,
    '예약할 수 없는 자원입니다.'
  );
  assert.equal(
    mapResourceReservationError('Time slot already reserved', 'x').message,
    '이미 예약된 시간대입니다.'
  );

  const catalog = readSrc('src/core/resources/resourceCapability.ts');
  assert.match(catalog, /listResources|list:/);
  assert.match(catalog, /setActive/);
  assert.match(catalog, /availabilityWindows/);
  assert.doesNotMatch(catalog, /bath|sauna|piano|pilates|skin|retail/i);
  assert.doesNotMatch(catalog, /create_staff_room_reservation|request_room_reservation/);

  const service = readSrc('src/core/resources/resourceService.ts');
  assert.match(service, /list_org_bookable_resources/);
  assert.match(service, /upsert_bookable_resource/);
  assert.match(service, /upsert_practice_room/);
  assert.match(service, /set_bookable_resource_active/);
  assert.match(service, /eq\('organization_id', organizationId\)/);
  assert.doesNotMatch(service, /sauna_jjimjilbang|bath_room|massage_room|scrub_station/);

  const sql = readSrc('supabase/migrations/20260924220000_set_bookable_resource_active.sql');
  assert.match(sql, /set_bookable_resource_active/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /organization_id = p_org_id/);
  assert.match(sql, /practice_rooms/);
  assert.doesNotMatch(sql, /CREATE TABLE/);
  assert.doesNotMatch(sql, /bath_room|massage_room|scrub_station|sauna_jjimjilbang/);

  const guarded = readSrc('supabase/migrations/20260924180000_bookable_resources.sql');
  assert.match(guarded, /AND is_active/);
  assert.match(guarded, /organization_id = p_org_id/);
  assert.match(guarded, /EXCLUDE|exclusion_violation/);
  assert.doesNotMatch(guarded, /CREATE TABLE core\.bath_/);

  const pianoFacade = readSrc('src/core/customer/services/practiceRoomReservationService.ts');
  assert.match(pianoFacade, /resourceReservationCapability/);
  assert.match(pianoFacade, /PRACTICE_ROOM_RESOURCE_KIND/);

  const reservationCap = readSrc('src/core/resources/resourceReservationCapability.ts');
  assert.match(reservationCap, /resourceCapability/);
  assert.match(reservationCap, /listBookable|upsert/);

  console.log('resourceCapability.test.ts: ok');
}

run();
