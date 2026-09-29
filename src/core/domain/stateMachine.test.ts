/**
 * Reservation state machine.
 * 실행: npm run test:reservation-machine
 */
import assert from 'node:assert/strict';
import { IllegalStateTransitionError } from './stateMachine';
import {
  applyReservationCommand,
  canApplyReservationCommand,
  RESERVATION_MACHINE,
  RESERVATION_STATES,
} from '../schedules/reservationMachine';

function run() {
  assert.deepEqual([...RESERVATION_STATES], ['requested', 'confirmed', 'cancelled']);
  assert.equal(RESERVATION_MACHINE.initial, 'requested');

  assert.equal(applyReservationCommand('requested', 'confirm'), 'confirmed');
  assert.equal(applyReservationCommand('requested', 'cancel'), 'cancelled');
  assert.equal(applyReservationCommand('confirmed', 'cancel'), 'cancelled');

  assert.equal(canApplyReservationCommand('confirmed', 'confirm'), false);
  assert.equal(canApplyReservationCommand('cancelled', 'confirm'), false);
  assert.equal(canApplyReservationCommand('cancelled', 'cancel'), false);

  assert.throws(
    () => applyReservationCommand('confirmed', 'confirm'),
    (err: unknown) => err instanceof IllegalStateTransitionError
  );
  assert.throws(
    () => applyReservationCommand('cancelled', 'cancel'),
    (err: unknown) => err instanceof IllegalStateTransitionError
  );

  console.log('stateMachine.test.ts: ok');
}

run();
