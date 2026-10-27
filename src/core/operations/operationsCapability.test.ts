/**
 * Operations Capability. 실행: npm run test:operations
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapOpsRpcError } from './errors';
import {
  rowToChecklistTemplate,
  rowToMaintenanceIssue,
  rowToOpsTask,
  type ChecklistItemRow,
  type ChecklistTemplateRow,
  type MaintenanceIssueRow,
  type OpsTaskRow,
} from './mappers';
import {
  canTransitionIssue,
  canTransitionTask,
  evaluateTaskAssign,
  evaluateTaskComplete,
  normalizeChecklistItems,
  requiredChecksComplete,
} from './transitions';
import {
  CHECKLIST_PURPOSES,
  OPS_ISSUE_STATUSES,
  OPS_TARGET_TYPES,
  OPS_TASK_PRIORITIES,
  OPS_TASK_STATUSES,
} from './types';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkTs(full, acc);
      continue;
    }
    if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function run() {
  assert.deepEqual([...CHECKLIST_PURPOSES], ['open', 'close', 'inspect', 'clean', 'repair', 'other']);
  assert.deepEqual([...OPS_TARGET_TYPES], ['resource', 'facility', 'equipment', 'location']);
  assert.deepEqual([...OPS_TASK_STATUSES], ['open', 'assigned', 'in_progress', 'completed', 'cancelled']);
  assert.deepEqual([...OPS_TASK_PRIORITIES], ['low', 'normal', 'high', 'urgent']);
  assert.deepEqual([...OPS_ISSUE_STATUSES], [
    'reported',
    'acknowledged',
    'in_progress',
    'resolved',
    'cancelled',
  ]);

  const items = normalizeChecklistItems([
    { title: '마감 전원', required: true, order: 2 },
    { title: '오픈 환기', required: false, order: 1 },
    { title: '  ', required: true },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, '오픈 환기');
  assert.equal(items[0].order, 1);
  assert.equal(items[1].title, '마감 전원');
  assert.equal(items[1].required, true);

  assert.equal(evaluateTaskAssign('open').next, 'assigned');
  assert.equal(evaluateTaskAssign('completed').ok, false);
  assert.deepEqual(evaluateTaskComplete('open'), { ok: true, action: 'completed' });
  assert.deepEqual(evaluateTaskComplete('completed'), { ok: true, action: 'idempotent' });
  assert.deepEqual(evaluateTaskComplete('cancelled'), { ok: false, reason: 'not_completable' });
  assert.equal(canTransitionTask('assigned', 'in_progress'), true);
  assert.equal(canTransitionTask('completed', 'open'), false);
  assert.equal(canTransitionIssue('reported', 'resolved'), true);
  assert.equal(canTransitionIssue('resolved', 'reported'), false);

  assert.equal(
    requiredChecksComplete([
      {
        id: 'c1',
        organizationId: 'org-1',
        taskId: 't1',
        title: '필수',
        required: true,
        order: 1,
        completed: true,
      },
      {
        id: 'c2',
        organizationId: 'org-1',
        taskId: 't1',
        title: '선택',
        required: false,
        order: 2,
        completed: false,
      },
    ]),
    true
  );
  assert.equal(
    requiredChecksComplete([
      {
        id: 'c1',
        organizationId: 'org-1',
        taskId: 't1',
        title: '필수',
        required: true,
        order: 1,
        completed: false,
      },
    ]),
    false
  );

  const templateRow: ChecklistTemplateRow = {
    id: 'tpl-1',
    organization_id: 'org-1',
    name: '오픈',
    purpose: 'open',
    target_type: 'resource',
    is_active: true,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  };
  const itemRow: ChecklistItemRow = {
    id: 'it-1',
    organization_id: 'org-1',
    template_id: 'tpl-1',
    title: '환기',
    required: true,
    sort_order: 1,
    metadata: {},
  };
  const template = rowToChecklistTemplate(templateRow, [itemRow]);
  assert.equal(template.organizationId, 'org-1');
  assert.equal(template.items[0].order, 1);

  const task = rowToOpsTask({
    id: 'task-1',
    organization_id: 'org-1',
    target_type: 'resource',
    target_id: 'res-1',
    template_id: 'tpl-1',
    assigned_staff_id: 'st-1',
    status: 'assigned',
    priority: 'normal',
    due_at: null,
    completed_at: null,
    issue_id: null,
    notification_id: null,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  } satisfies OpsTaskRow);
  assert.equal(task.assignedStaffId, 'st-1');
  assert.equal(task.targetType, 'resource');

  const issue = rowToMaintenanceIssue({
    id: 'iss-1',
    organization_id: 'org-1',
    target_type: 'equipment',
    target_id: 'eq-1',
    reported_by: 'st-1',
    assigned_staff_id: null,
    task_id: null,
    status: 'reported',
    description: '소음',
    resolution: null,
    resolved_at: null,
    notification_id: null,
    metadata: {},
    created_at: '2026-09-24T01:00:00.000Z',
    updated_at: '2026-09-24T01:00:00.000Z',
  } satisfies MaintenanceIssueRow);
  assert.equal(issue.reportedBy, 'st-1');
  assert.equal(issue.resolution, undefined);

  assert.equal(mapOpsRpcError({ message: 'Organization mismatch' }).code, 'org_mismatch');
  assert.equal(mapOpsRpcError({ message: 'Staff not found in organization' }).code, 'staff');
  assert.equal(mapOpsRpcError({ message: 'Required checklist items incomplete' }).code, 'checks');

  const sql = readFileSync(join(root, 'supabase/migrations/20260924260000_operations_capability.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE core\.checklist_templates/);
  assert.match(sql, /CREATE TABLE core\.checklist_items/);
  assert.match(sql, /CREATE TABLE core\.ops_tasks/);
  assert.match(sql, /CREATE TABLE core\.ops_task_checks/);
  assert.match(sql, /CREATE TABLE core\.maintenance_issues/);
  assert.match(sql, /upsert_checklist_template/);
  assert.match(sql, /create_ops_task/);
  assert.match(sql, /assign_ops_task/);
  assert.match(sql, /set_ops_task_status/);
  assert.match(sql, /report_maintenance_issue/);
  assert.match(sql, /set_maintenance_issue_status/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /is_org_staff_actor/);
  assert.match(sql, /organization_id/);
  assert.match(sql, /REFERENCES core\.staff/);
  assert.match(sql, /notification_id/);
  assert.match(sql, /Organization mismatch/);
  assert.match(sql, /Staff not found in organization/);
  assert.doesNotMatch(sql, /CREATE TABLE bath\./);
  assert.doesNotMatch(sql, /sauna_jjimjilbang/);
  assert.doesNotMatch(sql, /bath_room|massage_room|scrub_station/);
  assert.doesNotMatch(sql, /INSERT INTO core\.notifications/);

  const src = walkTs(join(root, 'src/core/operations'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(src, /sauna_jjimjilbang/);
  assert.doesNotMatch(src, /from '@\/modules\//);
  assert.doesNotMatch(src, /pilates|piano|beauty|retail|sauna/i);
  assert.doesNotMatch(src, /bath\./);

  const repo = readFileSync(join(here, 'repositories.ts'), 'utf8');
  assert.match(repo, /eq\('organization_id', organizationId\)/);
  assert.match(repo, /checklist_templates/);
  assert.match(repo, /ops_tasks/);
  assert.match(repo, /maintenance_issues/);

  const service = readFileSync(join(here, 'operationsService.ts'), 'utf8');
  assert.match(service, /upsert_checklist_template/);
  assert.match(service, /assign_ops_task/);
  assert.match(service, /set_ops_task_status/);
  assert.doesNotMatch(service, /create_sale/);

  console.log('operationsCapability.test.ts: ok');
}

run();
