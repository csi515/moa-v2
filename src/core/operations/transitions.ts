import type { OpsIssueStatus, OpsTaskCheck, OpsTaskStatus } from './types';

const TASK_NEXT: Record<OpsTaskStatus, readonly OpsTaskStatus[]> = {
  open: ['assigned', 'in_progress', 'completed', 'cancelled'],
  assigned: ['in_progress', 'open', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

const ISSUE_NEXT: Record<OpsIssueStatus, readonly OpsIssueStatus[]> = {
  reported: ['acknowledged', 'in_progress', 'resolved', 'cancelled'],
  acknowledged: ['in_progress', 'resolved', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['resolved'],
  cancelled: ['cancelled'],
};

export function canTransitionTask(from: OpsTaskStatus, to: OpsTaskStatus): boolean {
  return TASK_NEXT[from].includes(to);
}

export function canTransitionIssue(from: OpsIssueStatus, to: OpsIssueStatus): boolean {
  return ISSUE_NEXT[from].includes(to);
}

export function evaluateTaskAssign(status: OpsTaskStatus): {
  ok: boolean;
  next?: OpsTaskStatus;
  reason?: 'not_assignable';
} {
  if (status === 'completed' || status === 'cancelled') {
    return { ok: false, reason: 'not_assignable' };
  }
  if (status === 'open') return { ok: true, next: 'assigned' };
  return { ok: true, next: status };
}

export function evaluateTaskComplete(status: OpsTaskStatus):
  | { ok: true; action: 'completed' | 'idempotent' }
  | { ok: false; reason: 'not_completable' } {
  if (status === 'completed') return { ok: true, action: 'idempotent' };
  if (!canTransitionTask(status, 'completed')) return { ok: false, reason: 'not_completable' };
  return { ok: true, action: 'completed' };
}

export function requiredChecksComplete(checks: readonly OpsTaskCheck[]): boolean {
  return checks.filter((check) => check.required).every((check) => check.completed);
}

export function sortChecklistItems<T extends { order: number; title: string }>(items: readonly T[]): T[] {
  return items
    .slice()
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((item, index) => ({ ...item, order: index + 1 }));
}

export function normalizeChecklistItems(
  items: readonly { title?: string; required?: boolean; order?: number }[]
): { title: string; required: boolean; order: number }[] {
  const mapped = items
    .map((item, index) => ({
      title: (item.title ?? '').trim(),
      required: item.required !== false,
      order: Number.isFinite(item.order) ? Math.floor(Number(item.order)) : index + 1,
    }))
    .filter((item) => item.title.length > 0);
  return sortChecklistItems(mapped);
}
