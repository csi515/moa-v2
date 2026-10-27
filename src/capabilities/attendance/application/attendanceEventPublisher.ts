/**
 * Attendance Capability - Domain Event Publisher Helper.
 *
 * 출석 체크인/체크아웃 발생 시 Core Domain Event Bus에 표준 이벤트를 발행한다.
 * 타 모듈을 직접 import하지 않고 Core 이벤트 규약만 사용한다.
 */

import {
  domainEventBus,
  DOMAIN_EVENT_NAMES,
  type AttendanceCheckedInPayload,
  type AttendanceCheckedOutPayload,
  type DomainEventBus,
  type PublishResult,
} from '@/core/events';

export async function publishAttendanceCheckedIn(
  tenantId: string,
  payload: AttendanceCheckedInPayload,
  options: {
    bus?: DomainEventBus;
    actorId?: string;
    forwardToOutbox?: boolean;
  } = {}
): Promise<PublishResult> {
  const bus = options.bus ?? domainEventBus;
  return bus.publish<AttendanceCheckedInPayload>(
    DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
    payload,
    {
      tenantId,
      forwardToOutbox: options.forwardToOutbox,
      metadata: {
        actorId: options.actorId,
        source: 'attendance_kiosk_or_admin',
      },
    }
  );
}

export async function publishAttendanceCheckedOut(
  tenantId: string,
  payload: AttendanceCheckedOutPayload,
  options: {
    bus?: DomainEventBus;
    actorId?: string;
    forwardToOutbox?: boolean;
  } = {}
): Promise<PublishResult> {
  const bus = options.bus ?? domainEventBus;
  return bus.publish<AttendanceCheckedOutPayload>(
    DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_OUT,
    payload,
    {
      tenantId,
      forwardToOutbox: options.forwardToOutbox,
      metadata: {
        actorId: options.actorId,
        source: 'attendance_kiosk_or_admin',
      },
    }
  );
}
