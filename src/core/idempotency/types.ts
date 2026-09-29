/** 중요 command 재시도 가드. organization_id 가 tenant 경계. */

export const IDEMPOTENCY_OPERATIONS = [
  'payment',
  'refund',
  'booking',
  'reservation',
  'pass_consume',
  'pass_refund',
  'check_in',
  'check_out',
  'sale',
  'inventory_movement',
] as const;

export type IdempotencyOperation = (typeof IDEMPOTENCY_OPERATIONS)[number];

export const IDEMPOTENCY_STATUSES = ['processing', 'succeeded', 'failed'] as const;
export type IdempotencyStatus = (typeof IDEMPOTENCY_STATUSES)[number];

export const IDEMPOTENCY_PILOT_OPERATIONS: readonly IdempotencyOperation[] = [
  'booking',
  'payment',
];

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  operation: string;
  actorUserId?: string | null;
  requestHash: string;
  status: IdempotencyStatus;
  responsePayload: unknown | null;
  createdAt: string;
  expiresAt: string;
};

export type BeginIdempotencyInput = {
  organizationId: string;
  key: string;
  operation: string;
  requestHash: string;
  now?: number;
};

export type BeginIdempotencyResult =
  | { outcome: 'execute' }
  | { outcome: 'replay'; response: unknown }
  | { outcome: 'mismatch' }
  | { outcome: 'in_progress' };
