/**
 * Bath Service 도메인. 실행: npm run test:bath-service
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowToBathService, type BathServiceRow } from './offeredServiceMappers';
import { mapBathServiceRpcError } from './offeredServiceErrors';
import { buildBathServiceTimeSlot, validateBathServiceInput } from './offeredServiceValidation';
import { BATH_SERVICE_CATEGORIES } from '../types/service';
import type { BathServiceWriteInput } from '../types/service';

function validInput(partial: Partial<BathServiceWriteInput> = {}): BathServiceWriteInput {
  return {
    name: '세신 30분',
    category: 'scrub',
    durationMinutes: 30,
    basePrice: 40000,
    requiresStaff: true,
    requiresResource: true,
    ...partial,
  };
}

function run() {
  assert.ok(BATH_SERVICE_CATEGORIES.includes('scrub'));
  assert.ok(BATH_SERVICE_CATEGORIES.includes('massage'));

  assert.equal(validateBathServiceInput(validInput()).ok, true);
  assert.equal(validateBathServiceInput(validInput({ name: '마사지 60분', category: 'massage', durationMinutes: 60 })).ok, true);
  assert.deepEqual(validateBathServiceInput(validInput({ name: '  ' })), { ok: false, reason: 'name' });
  assert.deepEqual(validateBathServiceInput(validInput({ durationMinutes: 4 })), {
    ok: false,
    reason: 'duration',
  });
  assert.deepEqual(validateBathServiceInput(validInput({ durationMinutes: 40.5 })), {
    ok: false,
    reason: 'duration',
  });
  assert.deepEqual(validateBathServiceInput(validInput({ basePrice: -1 })), {
    ok: false,
    reason: 'base_price',
  });
  assert.deepEqual(
    validateBathServiceInput(validInput({ category: 'sauna' as BathServiceWriteInput['category'] })),
    { ok: false, reason: 'category' }
  );

  const row: BathServiceRow = {
    id: 'svc-1',
    organization_id: 'org-1',
    name: '세신 40분',
    category: 'scrub',
    duration_minutes: 40,
    base_price: '50000.00',
    requires_staff: true,
    requires_resource: true,
    product_id: 'prod-optional',
    active: true,
    sort_order: 2,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
    resource_ids: ['res-1'],
    staff_ids: ['staff-1'],
  };
  const service = rowToBathService(row);
  assert.equal(service.organizationId, 'org-1');
  assert.equal(service.durationMinutes, 40);
  assert.equal(service.basePrice, 50000);
  assert.equal(service.productId, 'prod-optional');
  assert.deepEqual(service.resourceIds, ['res-1']);
  assert.deepEqual(service.staffIds, ['staff-1']);
  assert.equal(service.active, true);

  const slot = buildBathServiceTimeSlot({
    service,
    startsAt: '2026-09-24T01:00:00.000Z',
    resourceId: 'res-1',
    staffId: 'staff-1',
  });
  assert.equal(slot.endsAt, '2026-09-24T01:40:00.000Z');
  assert.equal(slot.durationMinutes, 40);

  assert.equal(mapBathServiceRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');
  assert.equal(mapBathServiceRpcError({ message: 'Invalid duration' }).code, 'duration');
  assert.equal(mapBathServiceRpcError({ message: 'Resource not found in organization' }).code, 'resource');

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(here, '../../../../supabase/migrations/20260924200000_bath_services.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE TABLE bath\.services/);
  assert.match(sql, /UNIQUE \(organization_id, name\)/);
  assert.match(sql, /CREATE TABLE bath\.service_resources/);
  assert.match(sql, /CREATE TABLE bath\.service_staff/);
  assert.match(sql, /REFERENCES core\.bookable_resources/);
  assert.match(sql, /REFERENCES core\.staff/);
  assert.match(sql, /REFERENCES core\.products/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /duration_minutes/);
  assert.doesNotMatch(sql, /EXCLUDE USING gist/);
  assert.doesNotMatch(sql, /create_sale/);
  assert.doesNotMatch(sql, /CREATE TABLE core\.products/);
  assert.doesNotMatch(sql, /CREATE TABLE core\.services/);

  const facade = readFileSync(join(here, 'offeredServiceService.ts'), 'utf8');
  assert.match(facade, /resourceReservationCapability/);
  assert.match(facade, /set_service_resources/);
  assert.match(facade, /set_service_staff/);
  assert.match(facade, /requireOrgId/);
  assert.doesNotMatch(facade, /StorageService/);
  assert.doesNotMatch(facade, /create_sale/);

  const repo = readFileSync(join(here, 'offeredServiceRepository.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);

  console.log('offeredServiceDomain.test.ts: ok');
}

run();
