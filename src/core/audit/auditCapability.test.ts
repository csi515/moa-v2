/**
 * Tenant audit log foundation.
 * 실행: npm run test:audit
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowToAuditLog, type AuditLogRow } from './auditMappers';
import { AUDIT_FIELD_ALLOWLIST, AUDIT_PILOT_ENTITIES, isAuditEntityType } from './registry';
import { sanitizeAuditPair, sanitizeAuditPayload } from './sanitize';
import { AUDIT_ENTITY_TYPES } from './types';
import { buildAuditWriteArgs } from './auditArgs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function run() {
  assert.deepEqual(
    [...AUDIT_ENTITY_TYPES],
    [
      'customer',
      'staff',
      'booking',
      'reservation',
      'payment',
      'refund',
      'pass',
      'membership',
      'sale',
      'inventory',
      'permissions',
    ]
  );
  assert.deepEqual([...AUDIT_PILOT_ENTITIES], ['membership', 'permissions']);
  assert.equal(isAuditEntityType('membership'), true);
  assert.equal(isAuditEntityType('app_log'), false);

  const dirty = {
    role: 'staff',
    is_active: true,
    staff_id: 's1',
    user_id: 'u1',
    phone: '010-0000-0000',
    email: 'a@b.c',
    pin: '1234',
  };
  const cleaned = sanitizeAuditPayload('membership', dirty);
  assert.deepEqual(cleaned, {
    role: 'staff',
    is_active: true,
    staff_id: 's1',
    user_id: 'u1',
  });
  assert.equal(cleaned && 'phone' in cleaned, false);

  const unknown = sanitizeAuditPayload('hack', { phone: '010', secret: 'x', status: 'ok' });
  assert.deepEqual(unknown, {});

  const pair = sanitizeAuditPair(
    'permissions',
    { permission: 'finance.read', phone: '010', scope_type: 'organization', is_active: true },
    { permission: 'finance.read', scope_type: 'location', scope_id: 'loc-a', is_active: false }
  );
  assert.deepEqual(pair.beforeData, {
    permission: 'finance.read',
    scope_type: 'organization',
    is_active: true,
  });
  assert.equal(pair.afterData?.scope_id, 'loc-a');
  assert.equal(pair.afterData && 'phone' in pair.afterData, false);

  const args = buildAuditWriteArgs({
    organizationId: 'org-a',
    entityType: 'membership',
    entityId: 'm1',
    action: 'role_changed',
    beforeData: { role: 'staff', phone: '010' },
    afterData: { role: 'admin', email: 'x' },
    idempotencyKey: 'req-1',
  });
  assert.equal(args.p_organization_id, 'org-a');
  assert.deepEqual(args.p_before_data, { role: 'staff' });
  assert.deepEqual(args.p_after_data, { role: 'admin' });
  assert.equal(args.p_idempotency_key, 'req-1');

  const mapped = rowToAuditLog({
    id: 'a1',
    organization_id: 'org-a',
    location_id: null,
    actor_user_id: 'u1',
    action: 'role_changed',
    entity_type: 'membership',
    entity_id: 'm1',
    before_data: { role: 'staff' },
    after_data: { role: 'admin' },
    request_id: null,
    idempotency_key: null,
    created_at: '2026-09-24T09:00:00.000Z',
  } satisfies AuditLogRow);
  assert.equal(mapped.organizationId, 'org-a');
  assert.equal(mapped.entityType, 'membership');
  assert.equal(mapped.locationId, null);

  const sql = readFileSync(
    join(root, 'supabase/migrations/20260924300000_tenant_audit_log.sql'),
    'utf8'
  );
  assert.match(sql, /CREATE TABLE core\.audit_logs/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.append_audit_log/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.append_audit_log_internal/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION core\.sanitize_audit_payload/);
  assert.match(sql, /audit_organization_members_update/);
  assert.match(sql, /AFTER UPDATE ON core\.organization_members/);
  assert.match(sql, /audit_authorization_grants_write/);
  assert.match(sql, /AFTER INSERT OR UPDATE OR DELETE ON core\.authorization_grants/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON core\.audit_logs/);
  assert.doesNotMatch(sql, /CREATE POLICY audit_logs_.*DELETE/);
  assert.doesNotMatch(sql, /ALTER TABLE core\.(customers|staff|sales|schedules|inventory)/);
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION core\.(create_sale|create_organization|upsert_location)/);
  for (const entity of AUDIT_ENTITY_TYPES) {
    assert.match(sql, new RegExp(`'${entity}'`));
  }
  for (const [entity, fields] of Object.entries(AUDIT_FIELD_ALLOWLIST)) {
    for (const field of fields) {
      assert.match(sql, new RegExp(`WHEN '${entity}'[\\s\\S]*'${field}'`));
    }
  }

  const writer = readFileSync(join(here, 'auditWriter.ts'), 'utf8');
  assert.match(writer, /append_audit_log/);
  assert.match(writer, /buildAuditWriteArgs/);
  assert.doesNotMatch(writer, /\.from\('audit_logs'\)\.insert/);

  console.log('auditCapability.test.ts: ok');
}

run();
