/**
 * 공통 운영 작업. 상태 변경은 RPC. 업종 객체를 만들지 않는다.
 */
import { getCoreClient } from '@/lib/supabase';
import { mapOpsRpcError } from './errors';
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
import { listChecklistTemplates, listMaintenanceIssues, listOpsTasks } from './repositories';
import type {
  ChecklistTemplate,
  ChecklistUpsertInput,
  CreateOpsTaskInput,
  MaintenanceIssue,
  OpsIssueStatus,
  OpsListQuery,
  OpsMutationAction,
  OpsTask,
  OpsTaskStatus,
  ReportIssueInput,
} from './types';

type RpcPayload = Record<string, unknown>;

type OpsRpcName =
  | 'upsert_checklist_template'
  | 'deactivate_checklist_template'
  | 'create_ops_task'
  | 'assign_ops_task'
  | 'set_ops_task_status'
  | 'set_ops_task_check'
  | 'report_maintenance_issue'
  | 'set_maintenance_issue_status';

async function callOpsRpc(name: OpsRpcName, args: Record<string, unknown>): Promise<RpcPayload> {
  const client = getCoreClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapOpsRpcError(error).message);
  if (!data || typeof data !== 'object') throw new Error('운영 작업 처리에 실패했습니다.');
  return data as RpcPayload;
}

function templateFromPayload(payload: RpcPayload): ChecklistTemplate {
  const template = payload.template as ChecklistTemplateRow;
  const items = (payload.items as ChecklistItemRow[] | undefined) ?? [];
  return rowToChecklistTemplate(template, items);
}

function taskFromPayload(payload: RpcPayload): OpsTask {
  const task = payload.task as OpsTaskRow;
  const checks = (payload.checks as OpsTaskCheckRow[] | undefined) ?? [];
  return rowToOpsTask(task, checks);
}

export const operationsService = {
  listTemplates(organizationId: string, query: OpsListQuery = {}) {
    return listChecklistTemplates(organizationId, query);
  },

  listTasks(organizationId: string, query: OpsListQuery = {}) {
    return listOpsTasks(organizationId, query);
  },

  listIssues(organizationId: string, query: OpsListQuery = {}) {
    return listMaintenanceIssues(organizationId, query);
  },

  async upsertTemplate(
    organizationId: string,
    input: ChecklistUpsertInput
  ): Promise<{ action: OpsMutationAction; template: ChecklistTemplate }> {
    const payload = await callOpsRpc('upsert_checklist_template', {
      p_organization_id: organizationId,
      p_name: input.name,
      p_items: input.items.map((item) => ({
        title: item.title,
        required: item.required !== false,
        order: item.order ?? null,
      })),
      p_id: input.id ?? null,
      p_target_type: input.targetType ?? null,
      p_purpose: input.purpose ?? 'other',
      p_metadata: input.metadata ?? {},
    });
    return {
      action: (payload.action as OpsMutationAction) || 'created',
      template: templateFromPayload(payload),
    };
  },

  async deactivateTemplate(
    organizationId: string,
    templateId: string
  ): Promise<{ action: OpsMutationAction; template: ChecklistTemplate }> {
    const payload = await callOpsRpc('deactivate_checklist_template', {
      p_organization_id: organizationId,
      p_template_id: templateId,
    });
    return {
      action: (payload.action as OpsMutationAction) || 'deactivated',
      template: templateFromPayload(payload),
    };
  },

  async createTask(
    organizationId: string,
    input: CreateOpsTaskInput
  ): Promise<{ action: OpsMutationAction; task: OpsTask }> {
    const payload = await callOpsRpc('create_ops_task', {
      p_organization_id: organizationId,
      p_target_type: input.targetType,
      p_target_id: input.targetId,
      p_template_id: input.templateId ?? null,
      p_assigned_staff_id: input.assignedStaffId ?? null,
      p_priority: input.priority ?? 'normal',
      p_due_at: input.dueAt ?? null,
      p_issue_id: input.issueId ?? null,
      p_metadata: input.metadata ?? {},
    });
    return { action: (payload.action as OpsMutationAction) || 'created', task: taskFromPayload(payload) };
  },

  async assignTask(
    organizationId: string,
    taskId: string,
    staffId: string
  ): Promise<{ action: OpsMutationAction; task: OpsTask }> {
    const payload = await callOpsRpc('assign_ops_task', {
      p_organization_id: organizationId,
      p_task_id: taskId,
      p_staff_id: staffId,
    });
    return { action: (payload.action as OpsMutationAction) || 'assigned', task: taskFromPayload(payload) };
  },

  async setTaskStatus(
    organizationId: string,
    taskId: string,
    status: OpsTaskStatus
  ): Promise<{ action: OpsMutationAction; task: OpsTask }> {
    const payload = await callOpsRpc('set_ops_task_status', {
      p_organization_id: organizationId,
      p_task_id: taskId,
      p_status: status,
    });
    return { action: (payload.action as OpsMutationAction) || 'updated', task: taskFromPayload(payload) };
  },

  async setTaskCheck(
    organizationId: string,
    taskId: string,
    checkId: string,
    completed: boolean
  ): Promise<{ action: OpsMutationAction; task: OpsTask }> {
    const payload = await callOpsRpc('set_ops_task_check', {
      p_organization_id: organizationId,
      p_task_id: taskId,
      p_check_id: checkId,
      p_completed: completed,
    });
    return { action: (payload.action as OpsMutationAction) || 'updated', task: taskFromPayload(payload) };
  },

  async reportIssue(
    organizationId: string,
    input: ReportIssueInput
  ): Promise<{ action: OpsMutationAction; issue: MaintenanceIssue }> {
    const payload = await callOpsRpc('report_maintenance_issue', {
      p_organization_id: organizationId,
      p_target_type: input.targetType,
      p_target_id: input.targetId,
      p_reported_by: input.reportedBy,
      p_description: input.description,
      p_metadata: input.metadata ?? {},
    });
    return {
      action: (payload.action as OpsMutationAction) || 'created',
      issue: rowToMaintenanceIssue(payload.issue as MaintenanceIssueRow),
    };
  },

  async setIssueStatus(
    organizationId: string,
    issueId: string,
    status: OpsIssueStatus,
    resolution?: string
  ): Promise<{ action: OpsMutationAction; issue: MaintenanceIssue }> {
    const payload = await callOpsRpc('set_maintenance_issue_status', {
      p_organization_id: organizationId,
      p_issue_id: issueId,
      p_status: status,
      p_resolution: resolution ?? null,
    });
    return {
      action: (payload.action as OpsMutationAction) || 'updated',
      issue: rowToMaintenanceIssue(payload.issue as MaintenanceIssueRow),
    };
  },
};

export { rowToChecklistItem, rowToTaskCheck };
