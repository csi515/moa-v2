export const WAITLIST_STATUSES = [
  'waiting',
  'notified',
  'assigned',
  'cancelled',
  'expired',
] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const WAITLIST_OPEN_STATUSES = ['waiting', 'notified'] as const;
export type WaitlistOpenStatus = (typeof WAITLIST_OPEN_STATUSES)[number];

/** 업종명 없음. schedule / resource / slot 만 사용한다. */
export const WAITLIST_TARGET_TYPES = ['schedule', 'resource', 'slot'] as const;
export type WaitlistTargetType = (typeof WAITLIST_TARGET_TYPES)[number];

export type WaitlistEntry = {
  id: string;
  organizationId: string;
  targetType: string;
  targetId: string;
  customerId: string;
  scheduleId?: string;
  requestedTime?: string;
  status: WaitlistStatus;
  position: number;
  displayPosition?: number;
  joinedAt: string;
  notifiedAt?: string;
  assignedAt?: string;
  cancelledAt?: string;
  expiredAt?: string;
  bookingId?: string;
  reservationId?: string;
  notificationId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WaitlistJoinInput = {
  targetType: string;
  targetId: string;
  customerId: string;
  scheduleId?: string;
  requestedTime?: string;
  bookingId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
};

export type WaitlistListQuery = {
  targetType?: string;
  targetId?: string;
  customerId?: string;
  status?: WaitlistStatus;
  openOnly?: boolean;
  limit?: number;
};

export type WaitlistMutationAction =
  | 'created'
  | 'notified'
  | 'assigned'
  | 'cancelled'
  | 'expired'
  | 'idempotent';

export type WaitlistMutationResult = {
  action: WaitlistMutationAction;
  entry: WaitlistEntry;
};
