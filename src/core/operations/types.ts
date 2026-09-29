export const CHECKLIST_PURPOSES = [
  'open',
  'close',
  'inspect',
  'clean',
  'repair',
  'other',
] as const;
export type ChecklistPurpose = (typeof CHECKLIST_PURPOSES)[number];

/** Resource/Facility 식별자. 업종 객체를 여기서 만들지 않는다. */
export const OPS_TARGET_TYPES = ['resource', 'facility', 'equipment', 'location'] as const;
export type OpsTargetType = (typeof OPS_TARGET_TYPES)[number];

export const OPS_TASK_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type OpsTaskStatus = (typeof OPS_TASK_STATUSES)[number];

export const OPS_TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type OpsTaskPriority = (typeof OPS_TASK_PRIORITIES)[number];

export const OPS_ISSUE_STATUSES = [
  'reported',
  'acknowledged',
  'in_progress',
  'resolved',
  'cancelled',
] as const;
export type OpsIssueStatus = (typeof OPS_ISSUE_STATUSES)[number];

export type ChecklistItemInput = {
  title: string;
  required?: boolean;
  order?: number;
};

export type ChecklistItem = {
  id: string;
  organizationId: string;
  templateId: string;
  title: string;
  required: boolean;
  order: number;
  metadata: Record<string, unknown>;
};

export type ChecklistTemplate = {
  id: string;
  organizationId: string;
  name: string;
  purpose: string;
  targetType?: string;
  active: boolean;
  metadata: Record<string, unknown>;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

export type OpsTaskCheck = {
  id: string;
  organizationId: string;
  taskId: string;
  itemId?: string;
  title: string;
  required: boolean;
  order: number;
  completed: boolean;
  completedAt?: string;
};

export type OpsTask = {
  id: string;
  organizationId: string;
  targetType: string;
  targetId: string;
  templateId?: string;
  assignedStaffId?: string;
  status: OpsTaskStatus;
  priority: OpsTaskPriority;
  dueAt?: string;
  completedAt?: string;
  issueId?: string;
  notificationId?: string;
  metadata: Record<string, unknown>;
  checks: OpsTaskCheck[];
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceIssue = {
  id: string;
  organizationId: string;
  targetType: string;
  targetId: string;
  reportedBy: string;
  assignedStaffId?: string;
  taskId?: string;
  status: OpsIssueStatus;
  description: string;
  resolution?: string;
  resolvedAt?: string;
  notificationId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistUpsertInput = {
  id?: string;
  name: string;
  purpose?: string;
  targetType?: string;
  items: ChecklistItemInput[];
  metadata?: Record<string, unknown>;
};

export type CreateOpsTaskInput = {
  targetType: string;
  targetId: string;
  templateId?: string;
  assignedStaffId?: string;
  priority?: OpsTaskPriority;
  dueAt?: string;
  issueId?: string;
  metadata?: Record<string, unknown>;
};

export type ReportIssueInput = {
  targetType: string;
  targetId: string;
  reportedBy: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type OpsListQuery = {
  targetType?: string;
  targetId?: string;
  status?: string;
  assignedStaffId?: string;
  activeOnly?: boolean;
  limit?: number;
};

export type OpsMutationAction =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'completed'
  | 'cancelled'
  | 'resolved'
  | 'deactivated'
  | 'idempotent';
