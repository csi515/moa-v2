import type { Json } from '@/lib/supabase/database.types';
import type {
  ChecklistItem,
  ChecklistTemplate,
  MaintenanceIssue,
  OpsIssueStatus,
  OpsTask,
  OpsTaskCheck,
  OpsTaskPriority,
  OpsTaskStatus,
} from './types';

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function optionalId(value: string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return value;
}

export type ChecklistTemplateRow = {
  id: string;
  organization_id: string;
  name: string;
  purpose: string;
  target_type: string | null;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemRow = {
  id: string;
  organization_id: string;
  template_id: string;
  title: string;
  required: boolean;
  sort_order: number;
  metadata: Json;
};

export type OpsTaskRow = {
  id: string;
  organization_id: string;
  target_type: string;
  target_id: string;
  template_id: string | null;
  assigned_staff_id: string | null;
  status: OpsTaskStatus;
  priority: OpsTaskPriority;
  due_at: string | null;
  completed_at: string | null;
  issue_id: string | null;
  notification_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type OpsTaskCheckRow = {
  id: string;
  organization_id: string;
  task_id: string;
  item_id: string | null;
  title: string;
  required: boolean;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
};

export type MaintenanceIssueRow = {
  id: string;
  organization_id: string;
  target_type: string;
  target_id: string;
  reported_by: string;
  assigned_staff_id: string | null;
  task_id: string | null;
  status: OpsIssueStatus;
  description: string;
  resolution: string | null;
  resolved_at: string | null;
  notification_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    templateId: row.template_id,
    title: row.title,
    required: row.required,
    order: row.sort_order,
    metadata: asRecord(row.metadata),
  };
}

export function rowToChecklistTemplate(
  row: ChecklistTemplateRow,
  items: ChecklistItemRow[] = []
): ChecklistTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    purpose: row.purpose,
    targetType: optionalId(row.target_type),
    active: row.is_active,
    metadata: asRecord(row.metadata),
    items: items.map(rowToChecklistItem).sort((a, b) => a.order - b.order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToTaskCheck(row: OpsTaskCheckRow): OpsTaskCheck {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    itemId: optionalId(row.item_id),
    title: row.title,
    required: row.required,
    order: row.sort_order,
    completed: row.completed,
    completedAt: row.completed_at || undefined,
  };
}

export function rowToOpsTask(row: OpsTaskRow, checks: OpsTaskCheckRow[] = []): OpsTask {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetType: row.target_type,
    targetId: row.target_id,
    templateId: optionalId(row.template_id),
    assignedStaffId: optionalId(row.assigned_staff_id),
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at || undefined,
    completedAt: row.completed_at || undefined,
    issueId: optionalId(row.issue_id),
    notificationId: optionalId(row.notification_id),
    metadata: asRecord(row.metadata),
    checks: checks.map(rowToTaskCheck).sort((a, b) => a.order - b.order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMaintenanceIssue(row: MaintenanceIssueRow): MaintenanceIssue {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reportedBy: row.reported_by,
    assignedStaffId: optionalId(row.assigned_staff_id),
    taskId: optionalId(row.task_id),
    status: row.status,
    description: row.description,
    resolution: row.resolution || undefined,
    resolvedAt: row.resolved_at || undefined,
    notificationId: optionalId(row.notification_id),
    metadata: asRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
