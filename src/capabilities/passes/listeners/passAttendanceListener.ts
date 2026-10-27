/**
 * Passes Capability - Attendance Event Listener.
 *
 * 출석 완료(attendance.checked_in) 이벤트를 수신하여 수강권 차감을 실행하고,
 * 잔여 횟수 소진/임박 시 passes.low_balance 또는 passes.exhausted 이벤트를 발행한다.
 *
 * Core 및 타 Capability와의 하드 커플링 없이 domainEventBus를 통해 완전히 분리(Decoupled)된다.
 */

import {
  domainEventBus,
  type DomainEvent,
  DOMAIN_EVENT_NAMES,
  type AttendanceCheckedInPayload,
  type PassDeductedPayload,
  type PassLowBalancePayload,
  type PassExhaustedPayload,
  type DomainEventBus,
} from '@/core/events';
import { deductPassUsage, type PassDefinition } from '../domain/passesEngine';

export interface PassDeductionHandlerOptions {
  /** 수강권 조회 함수 (인메모리 또는 DB 서비스 주입 가능) */
  findActivePassByStudent?: (studentId: string, passId?: string) => Promise<PassDefinition | null> | PassDefinition | null;
  /** 수강권 저장 함수 */
  savePass?: (updatedPass: PassDefinition) => Promise<void> | void;
  /** 소진 임박 임계치 (기본값: 1회) */
  lowBalanceThreshold?: number;
}

/**
 * 출석 체크인 이벤트를 받아 수강권을 차감하고 후속 도메인 이벤트를 발행하는 순수 리스너 로직.
 */
export async function handleAttendanceCheckedInForPass(
  event: DomainEvent<AttendanceCheckedInPayload>,
  options: PassDeductionHandlerOptions = {},
  bus: DomainEventBus = domainEventBus
): Promise<void> {
  const { studentId, passId, checkInTime, studentName } = event.payload;
  const threshold = options.lowBalanceThreshold ?? 1;

  // 1. 수강권 조회 (주입된 함수가 없으면 시뮬레이션 패스 생성 또는 건너뜀)
  let activePass: PassDefinition | null = null;
  if (options.findActivePassByStudent) {
    activePass = await options.findActivePassByStudent(studentId, passId);
  }

  if (!activePass) {
    return;
  }

  // 2. 수강권 차감 계산 (도메인 엔진 순수 함수 호출)
  const targetDate = checkInTime ? checkInTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const deductionResult = deductPassUsage(activePass, targetDate);

  if (!deductionResult.success) {
    return;
  }

  const updatedPass = deductionResult.updatedPass;

  // 3. 영속화
  if (options.savePass) {
    await options.savePass(updatedPass);
  }

  const isExhausted = updatedPass.remainingCount <= 0 && updatedPass.passType !== 'PERIOD_BASED';

  // 4. 후속 이벤트 발행: passes.deducted
  await bus.publish<PassDeductedPayload>(
    DOMAIN_EVENT_NAMES.PASS_DEDUCTED,
    {
      passId: updatedPass.id,
      studentId,
      deductedCount: 1,
      remainingCount: updatedPass.remainingCount,
      passType: updatedPass.passType,
      isExhausted,
    },
    {
      tenantId: event.tenantId,
      metadata: {
        triggerEventId: event.eventId,
        actorId: event.metadata?.actorId as string | undefined,
      },
    }
  );

  // 5. 소진 시: passes.exhausted 발행
  if (isExhausted) {
    await bus.publish<PassExhaustedPayload>(
      DOMAIN_EVENT_NAMES.PASS_EXHAUSTED,
      {
        passId: updatedPass.id,
        studentId,
        studentName,
        exhaustedAt: new Date().toISOString(),
      },
      {
        tenantId: event.tenantId,
        metadata: {
          triggerEventId: event.eventId,
        },
      }
    );
  } else if (updatedPass.remainingCount <= threshold && updatedPass.passType !== 'PERIOD_BASED') {
    // 6. 소진 임박 시: passes.low_balance 발행
    await bus.publish<PassLowBalancePayload>(
      DOMAIN_EVENT_NAMES.PASS_LOW_BALANCE,
      {
        passId: updatedPass.id,
        studentId,
        studentName,
        remainingCount: updatedPass.remainingCount,
        threshold,
      },
      {
        tenantId: event.tenantId,
        metadata: {
          triggerEventId: event.eventId,
        },
      }
    );
  }
}

/**
 * Passes Capability의 출석 연동 이벤트 구독기 등록
 */
export function registerPassAttendanceListener(
  options: PassDeductionHandlerOptions = {},
  bus: DomainEventBus = domainEventBus
): () => void {
  return bus.subscribe<AttendanceCheckedInPayload>(
    DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
    (event) => handleAttendanceCheckedInForPass(event, options, bus),
    {
      subscriberName: 'PassesCapability_AttendanceCheckedInListener',
      priority: 10,
    }
  );
}
