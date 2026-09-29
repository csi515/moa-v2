/**
 * core.reservations 상태 기계.
 * 현재 사용 중인 상태만 유지한다. scheduled/completed/no_show 는 Schedule 상태이다.
 */
import {
  applyTransition,
  canTransition,
  type StateMachine,
} from '@/core/domain/stateMachine';
import type { ReservationStatus } from '@/types';

export const RESERVATION_STATES = ['requested', 'confirmed', 'cancelled'] as const;
export type ReservationMachineStatus = (typeof RESERVATION_STATES)[number];

export const RESERVATION_COMMANDS = ['confirm', 'cancel'] as const;
export type ReservationCommand = (typeof RESERVATION_COMMANDS)[number];

export const RESERVATION_MACHINE: StateMachine<ReservationMachineStatus, ReservationCommand> = {
  name: 'reservation',
  states: RESERVATION_STATES,
  initial: 'requested',
  transitions: [
    { from: 'requested', command: 'confirm', to: 'confirmed' },
    { from: 'requested', command: 'cancel', to: 'cancelled' },
    { from: 'confirmed', command: 'cancel', to: 'cancelled' },
  ],
};

export function canApplyReservationCommand(
  status: ReservationStatus,
  command: ReservationCommand
): boolean {
  return canTransition(RESERVATION_MACHINE, status, command);
}

export function applyReservationCommand(
  status: ReservationStatus,
  command: ReservationCommand
): ReservationStatus {
  return applyTransition(RESERVATION_MACHINE, status, command);
}
