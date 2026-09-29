/**
 * 업종 무관 Customer Session Capability.
 * 방문 사실만 기록한다. 결제/예약/출석 원장을 복사하거나 차감하지 않는다.
 */
import { customerSessionService } from './sessionService';
import { evaluateSessionCancel, evaluateSessionFinish, evaluateSessionStart } from './transitions';
import { CUSTOMER_SESSION_SOURCES, CUSTOMER_SESSION_STATUSES } from './types';

export const customerSessionCapability = {
  statuses: CUSTOMER_SESSION_STATUSES,
  sources: CUSTOMER_SESSION_SOURCES,
  list: customerSessionService.list,
  listActive: customerSessionService.listActive,
  getById: customerSessionService.getById,
  getActive: customerSessionService.getActive,
  start: customerSessionService.start,
  finish: customerSessionService.finish,
  finishActive: customerSessionService.finishActive,
  cancel: customerSessionService.cancel,
  evaluateStart: evaluateSessionStart,
  evaluateFinish: evaluateSessionFinish,
  evaluateCancel: evaluateSessionCancel,
} as const;

export type CustomerSessionCapability = typeof customerSessionCapability;
