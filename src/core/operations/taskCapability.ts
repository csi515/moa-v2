/**
 * 업종 무관 Task / Work Order Capability.
 * 직원 배정은 Core Staff. 대상은 Resource 식별자를 연결한다.
 */
import { operationsService } from './operationsService';
import {
  canTransitionTask,
  evaluateTaskAssign,
  evaluateTaskComplete,
  requiredChecksComplete,
} from './transitions';
import { OPS_TASK_PRIORITIES, OPS_TASK_STATUSES, OPS_TARGET_TYPES } from './types';

export const taskCapability = {
  statuses: OPS_TASK_STATUSES,
  priorities: OPS_TASK_PRIORITIES,
  targetTypes: OPS_TARGET_TYPES,
  list: operationsService.listTasks,
  create: operationsService.createTask,
  assign: operationsService.assignTask,
  setStatus: operationsService.setTaskStatus,
  setCheck: operationsService.setTaskCheck,
  complete(organizationId: string, taskId: string) {
    return operationsService.setTaskStatus(organizationId, taskId, 'completed');
  },
  canTransition: canTransitionTask,
  evaluateAssign: evaluateTaskAssign,
  evaluateComplete: evaluateTaskComplete,
  requiredChecksComplete,
} as const;

export type TaskCapability = typeof taskCapability;
