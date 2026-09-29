/**
 * 업종 무관 Maintenance Issue Capability.
 * 고장 신고와 수리 완료. 실제 알림은 보내지 않는다.
 */
import { operationsService } from './operationsService';
import { canTransitionIssue } from './transitions';
import { OPS_ISSUE_STATUSES, OPS_TARGET_TYPES } from './types';

export const maintenanceCapability = {
  statuses: OPS_ISSUE_STATUSES,
  targetTypes: OPS_TARGET_TYPES,
  list: operationsService.listIssues,
  report: operationsService.reportIssue,
  setStatus: operationsService.setIssueStatus,
  resolve(organizationId: string, issueId: string, resolution: string) {
    return operationsService.setIssueStatus(organizationId, issueId, 'resolved', resolution);
  },
  canTransition: canTransitionIssue,
} as const;

export type MaintenanceCapability = typeof maintenanceCapability;
