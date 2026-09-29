/**
 * Command / Handler 타입과 reservation confirm 파일럿.
 * 조회(query)는 이 경계를 쓰지 않는다.
 */
import { compatIsOrgAdmin, compatIsOrgStaffActor } from '@/core/authorization/compatibility';
import type { CommandHandler, DomainCommand, RequestContext } from './types';

export type { CommandHandler, DomainCommand } from './types';

export const CONFIRM_RESERVATION_COMMAND = 'reservation.confirm';

export type ConfirmReservationInput = {
  reservationId: string;
};

export type ConfirmReservationPort = (reservationId: string) => Promise<void>;

export function confirmReservationCommand(
  reservationId: string
): DomainCommand<ConfirmReservationInput> {
  return {
    name: CONFIRM_RESERVATION_COMMAND,
    input: { reservationId },
  };
}

/** 기존 원장/관리자 확정 권한. 새 permission 키를 만들지 않는다. */
export function canConfirmReservation(context: RequestContext): boolean {
  return compatIsOrgAdmin(context.role) || compatIsOrgStaffActor(context.role);
}

/**
 * confirm_reservation RPC(idempotency/outbox 포함)를 실행하는 파일럿 handler.
 * 기존 reservationService.confirmReservation 을 port로 받는다.
 */
export function confirmReservationHandler(
  confirm: ConfirmReservationPort
): CommandHandler<ConfirmReservationInput, void> {
  return {
    name: CONFIRM_RESERVATION_COMMAND,
    authorize: canConfirmReservation,
    execute: async ({ input }) => {
      await confirm(input.reservationId);
    },
  };
}
