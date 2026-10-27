/**
 * Bath Room 도메인. 실행: npm run test:bath-room
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowToBathRoom, type BathRoomRow } from './roomMappers';
import { mapBathRoomRpcError } from './roomErrors';
import { validateBathRoomInput } from './roomValidation';
import { BATH_ROOM_RESOURCE_KIND, BATH_ROOM_TYPES } from '../types/room';
import type { BathRoomWriteInput } from '../types/room';

function validInput(partial: Partial<BathRoomWriteInput> = {}): BathRoomWriteInput {
  return {
    roomNumber: '201',
    name: '가족실 A',
    roomType: 'family',
    floorType: 'ondol',
    capacity: 4,
    bathtubCount: 1,
    basePrice: 80000,
    ...partial,
  };
}

function run() {
  assert.equal(BATH_ROOM_RESOURCE_KIND, 'bath_room');
  assert.ok(BATH_ROOM_TYPES.includes('private'));
  assert.ok(BATH_ROOM_TYPES.includes('family'));

  assert.equal(validateBathRoomInput(validInput()).ok, true);
  assert.deepEqual(validateBathRoomInput(validInput({ roomNumber: '  ' })), {
    ok: false,
    reason: 'room_number',
  });
  assert.deepEqual(validateBathRoomInput(validInput({ name: '' })), {
    ok: false,
    reason: 'name',
  });
  assert.deepEqual(validateBathRoomInput(validInput({ capacity: 0 })), {
    ok: false,
    reason: 'capacity',
  });
  assert.deepEqual(validateBathRoomInput(validInput({ capacity: 1.5 })), {
    ok: false,
    reason: 'capacity',
  });
  assert.deepEqual(validateBathRoomInput(validInput({ bathtubCount: -1 })), {
    ok: false,
    reason: 'bathtub_count',
  });
  assert.deepEqual(validateBathRoomInput(validInput({ basePrice: -1 })), {
    ok: false,
    reason: 'base_price',
  });
  assert.deepEqual(
    validateBathRoomInput(validInput({ roomType: 'sauna' as BathRoomWriteInput['roomType'] })),
    { ok: false, reason: 'room_type' }
  );

  const row: BathRoomRow = {
    id: 'room-1',
    organization_id: 'org-1',
    resource_id: 'res-1',
    room_number: '201',
    name: '가족실 A',
    room_type: 'family',
    floor_type: 'ondol',
    capacity: 4,
    bathtub_count: 1,
    has_scrub_station: false,
    has_shower: true,
    has_toilet: true,
    base_price: '80000.00',
    active: true,
    sort_order: 10,
    metadata: { sofa: true },
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  };
  const room = rowToBathRoom(row);
  assert.equal(room.organizationId, 'org-1');
  assert.equal(room.resourceId, 'res-1');
  assert.equal(room.basePrice, 80000);
  assert.equal(room.bathtubCount, 1);
  assert.equal(room.active, true);
  assert.equal('available' in room, false);
  assert.equal('booked' in room, false);

  assert.equal(mapBathRoomRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');
  assert.equal(mapBathRoomRpcError({ message: 'Invalid capacity' }).code, 'capacity');
  assert.equal(mapBathRoomRpcError({ message: 'Room number already exists' }).code, 'duplicate');

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924190000_bath_rooms.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE TABLE bath\.rooms/);
  assert.match(sql, /UNIQUE \(organization_id, room_number\)/);
  assert.match(sql, /REFERENCES core\.bookable_resources/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /kind = 'bath_room'|kind, 'bath_room'/);
  assert.match(sql, /core\.upsert_bookable_resource/);
  assert.match(sql, /status IN \('pending', 'approved'\)/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.upsert_room/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION bath\.set_room_active/);
  assert.doesNotMatch(sql, /EXCLUDE USING gist/);
  assert.doesNotMatch(sql, /create_sale/);
  assert.doesNotMatch(sql, /available\s+BOOLEAN|booked\s+BOOLEAN/);
  assert.doesNotMatch(sql, /core\.products/);

  const service = readFileSync(join(here, 'roomService.ts'), 'utf8');
  assert.match(service, /resourceReservationCapability/);
  assert.match(service, /resourceId: room\.resourceId/);
  assert.match(service, /requireOrgId/);
  assert.match(service, /validateBathRoomInput/);
  assert.match(service, /set_room_active/);
  assert.doesNotMatch(service, /StorageService/);
  assert.doesNotMatch(service, /create_sale/);

  const repo = readFileSync(join(here, 'roomRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);
  assert.match(repo, /eq\('active'/);

  const capability = readFileSync(
    join(here, '../../../core/resources/reservationService.ts'),
    'utf8'
  );
  assert.match(capability, /query\.resourceId/);
  assert.match(capability, /eq\('room_id', query\.resourceId\)/);

  console.log('roomDomain.test.ts: ok');
}

run();
