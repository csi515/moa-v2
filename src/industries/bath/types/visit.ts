export type BathVisitStatus = 'checked_in' | 'checked_out' | 'cancelled';

/** 목욕탕 이용 세션. 결제는 별도 Core 객체. */
export type BathVisit = {
  id: string;
  organizationId: string;
  customerId: string;
  checkInAt: string;
  checkOutAt?: string;
  status: BathVisitStatus;
  entryProductId?: string;
  passId?: string;
  lockerId?: string;
  roomReservationId?: string;
  staffId?: string;
  memo?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BathVisitCheckInInput = {
  customerId: string;
  staffId?: string;
  entryProductId?: string;
  passId?: string;
  lockerId?: string;
  roomReservationId?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
};

export type BathVisitMutationAction = 'created' | 'checked_out' | 'cancelled' | 'idempotent';

export type BathVisitMutationResult = {
  action: BathVisitMutationAction;
  visit: BathVisit;
};
