/**
 * 중요 command Idempotency Capability.
 * 기존 atomic RPC를 교체하지 않는다. 파일럿은 wrapper RPC.
 */
import {
  beginIdempotency,
  completeIdempotency,
  failIdempotency,
  runSerializedIdempotentCommands,
} from './evaluate';
import {
  bookingIdempotencyCanonical,
  newIdempotencyKey,
  paymentIdempotencyCanonical,
} from './hash';
import { IDEMPOTENCY_OPERATIONS, IDEMPOTENCY_PILOT_OPERATIONS } from './types';

export const idempotencyCapability = {
  operations: IDEMPOTENCY_OPERATIONS,
  pilots: IDEMPOTENCY_PILOT_OPERATIONS,
  bookingCanonical: bookingIdempotencyCanonical,
  paymentCanonical: paymentIdempotencyCanonical,
  newKey: newIdempotencyKey,
  begin: beginIdempotency,
  complete: completeIdempotency,
  fail: failIdempotency,
  runSerialized: runSerializedIdempotentCommands,
} as const;

export type IdempotencyCapability = typeof idempotencyCapability;
