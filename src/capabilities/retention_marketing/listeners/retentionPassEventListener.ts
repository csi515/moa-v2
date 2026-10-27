/**
 * Retention Marketing Capability - Pass Events Listener.
 *
 * 수강권 소진 임박(passes.low_balance) 및 소진(passes.exhausted) 이벤트를 수신하여
 * 자동 재등록 유도 마케팅 캠페인(retention.trigger_campaign)을 발행하고
 * 리텐션 알림/태스크를 생성한다.
 *
 * Core 및 passes 구체 모듈과의 하드 커플링 없이 domainEventBus와 표준 규약만으로 결합된다.
 */

import {
  domainEventBus,
  type DomainEvent,
  DOMAIN_EVENT_NAMES,
  type PassLowBalancePayload,
  type PassExhaustedPayload,
  type RetentionTriggerCampaignPayload,
  type DomainEventBus,
} from '@/core/events';

export interface RetentionHandlerOptions {
  /** 생성된 리텐션 후보를 저장하거나 발송 큐에 넣는 핸들러 */
  onTriggerCampaign?: (payload: RetentionTriggerCampaignPayload, tenantId: string) => Promise<void> | void;
}

/**
 * 수강권 소진 임박 핸들러
 */
export async function handlePassLowBalanceForRetention(
  event: DomainEvent<PassLowBalancePayload>,
  options: RetentionHandlerOptions = {},
  bus: DomainEventBus = domainEventBus
): Promise<void> {
  const { studentId, studentName, passId, remainingCount, threshold } = event.payload;

  const campaignPayload: RetentionTriggerCampaignPayload = {
    customerId: studentId,
    customerName: studentName,
    campaignType: 'low_balance',
    context: {
      passId,
      remainingCount,
      threshold,
      details: `수강권 잔여 횟수가 ${remainingCount}회 남았습니다. 재등록 안내가 필요합니다.`,
    },
  };

  // 1. 후속 도메인 이벤트 발행 (retention.trigger_campaign)
  await bus.publish<RetentionTriggerCampaignPayload>(
    DOMAIN_EVENT_NAMES.RETENTION_TRIGGER_CAMPAIGN,
    campaignPayload,
    {
      tenantId: event.tenantId,
      metadata: {
        triggerEventId: event.eventId,
        source: 'retention_pass_listener',
      },
    }
  );

  // 2. 주입된 콜백 실행
  if (options.onTriggerCampaign) {
    await options.onTriggerCampaign(campaignPayload, event.tenantId);
  }
}

/**
 * 수강권 완전 소진 핸들러
 */
export async function handlePassExhaustedForRetention(
  event: DomainEvent<PassExhaustedPayload>,
  options: RetentionHandlerOptions = {},
  bus: DomainEventBus = domainEventBus
): Promise<void> {
  const { studentId, studentName, passId, exhaustedAt } = event.payload;

  const campaignPayload: RetentionTriggerCampaignPayload = {
    customerId: studentId,
    customerName: studentName,
    campaignType: 'pass_exhausted',
    context: {
      passId,
      remainingCount: 0,
      referenceDate: exhaustedAt,
      details: '수강권이 전액 소진되었습니다. 즉시 재등록 상담을 권장합니다.',
    },
  };

  // 1. 후속 도메인 이벤트 발행 (retention.trigger_campaign)
  await bus.publish<RetentionTriggerCampaignPayload>(
    DOMAIN_EVENT_NAMES.RETENTION_TRIGGER_CAMPAIGN,
    campaignPayload,
    {
      tenantId: event.tenantId,
      metadata: {
        triggerEventId: event.eventId,
        source: 'retention_pass_listener',
      },
    }
  );

  // 2. 주입된 콜백 실행
  if (options.onTriggerCampaign) {
    await options.onTriggerCampaign(campaignPayload, event.tenantId);
  }
}

/**
 * Retention Marketing Capability의 수강권 소진 연동 이벤트 구독기 등록
 */
export function registerRetentionPassListeners(
  options: RetentionHandlerOptions = {},
  bus: DomainEventBus = domainEventBus
): () => void {
  const unsubLow = bus.subscribe<PassLowBalancePayload>(
    DOMAIN_EVENT_NAMES.PASS_LOW_BALANCE,
    (event) => handlePassLowBalanceForRetention(event, options, bus),
    {
      subscriberName: 'RetentionCapability_PassLowBalanceListener',
      priority: 5,
    }
  );

  const unsubExhausted = bus.subscribe<PassExhaustedPayload>(
    DOMAIN_EVENT_NAMES.PASS_EXHAUSTED,
    (event) => handlePassExhaustedForRetention(event, options, bus),
    {
      subscriberName: 'RetentionCapability_PassExhaustedListener',
      priority: 5,
    }
  );

  return () => {
    unsubLow();
    unsubExhausted();
  };
}
