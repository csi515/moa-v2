import { getCoreClient } from '@/lib/supabase';
import {
  rowToChecklistItem,
  rowToChecklistTemplate,
  rowToMaintenanceIssue,
  rowToOpsTask,
  rowToTaskCheck,
  type ChecklistItemRow,
  type ChecklistTemplateRow,
  type MaintenanceIssueRow,
  type OpsTaskCheckRow,
  type OpsTaskRow,
} from './mappers';
import type {
  ChecklistTemplate,
  MaintenanceIssue,
  OpsIssueStatus,
  OpsListQuery,
  OpsTask,
  OpsTaskStatus,
} from './types';

export async function listChecklistTemplates(
  organizationId: string,
  query: OpsListQuery = {}
): Promise<ChecklistTemplate[]> {
  const client = getCoreClient();
  let builder = client
    .from('checklist_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })
    .limit(query.limit ?? 100);
  if (query.activeOnly) builder = builder.eq('is_active', true);
  if (query.targetType) builder = builder.eq('target_type', query.targetType);

  const { data, error } = await builder;
  if (error) throw error;
  const templates = (data as ChecklistTemplateRow[] | null) ?? [];
  if (templates.length === 0) return [];

  const { data: itemRows, error: itemError } = await client
    .from('checklist_items')
    .select('*')
    .eq('organization_id', organizationId)
    .in(
      'template_id',
      templates.map((row) => row.id)
    )
    .order('sort_order', { ascending: true });
  if (itemError) throw itemError;
  const items = (itemRows as ChecklistItemRow[] | null) ?? [];
  return templates.map((row) =>
    rowToChecklistTemplate(
      row,
      items.filter((item) => item.template_id === row.id)
    )
  );
}

export async function listChecklistItems(
  organizationId: string,
  templateId: string
): Promise<ReturnType<typeof rowToChecklistItem>[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('checklist_items')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data as ChecklistItemRow[] | null) ?? []).map(rowToChecklistItem);
}

export async function listOpsTasks(
  organizationId: string,
  query: OpsListQuery = {}
): Promise<OpsTask[]> {
  const client = getCoreClient();
  let builder = client
    .from('ops_tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(query.limit ?? 100);
  if (query.targetType) builder = builder.eq('target_type', query.targetType);
  if (query.targetId) builder = builder.eq('target_id', query.targetId);
  if (query.status) builder = builder.eq('status', query.status as OpsTaskStatus);
  if (query.assignedStaffId) builder = builder.eq('assigned_staff_id', query.assignedStaffId);

  const { data, error } = await builder;
  if (error) throw error;
  const tasks = (data as OpsTaskRow[] | null) ?? [];
  if (tasks.length === 0) return [];

  const { data: checkRows, error: checkError } = await client
    .from('ops_task_checks')
    .select('*')
    .eq('organization_id', organizationId)
    .in(
      'task_id',
      tasks.map((row) => row.id)
    )
    .order('sort_order', { ascending: true });
  if (checkError) throw checkError;
  const checks = (checkRows as OpsTaskCheckRow[] | null) ?? [];
  return tasks.map((row) => rowToOpsTask(row, checks.filter((check) => check.task_id === row.id)));
}

export async function listMaintenanceIssues(
  organizationId: string,
  query: OpsListQuery = {}
): Promise<MaintenanceIssue[]> {
  const client = getCoreClient();
  let builder = client
    .from('maintenance_issues')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(query.limit ?? 100);
  if (query.targetType) builder = builder.eq('target_type', query.targetType);
  if (query.targetId) builder = builder.eq('target_id', query.targetId);
  if (query.status) builder = builder.eq('status', query.status as OpsIssueStatus);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data as MaintenanceIssueRow[] | null) ?? []).map(rowToMaintenanceIssue);
}
