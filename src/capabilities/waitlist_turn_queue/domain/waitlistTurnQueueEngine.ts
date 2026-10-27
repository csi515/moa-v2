export type WaitlistSeatPreference = 'any' | 'table' | 'bar' | 'room';
export type WaitlistStatus = 'waiting' | 'called' | 'seated' | 'cancelled' | 'no_show';

export interface WaitlistEntry {
  id: string;
  ticketNumber: number; // 1 ~ 999
  customerName: string;
  phoneLastDigits: string; // 4자리 (알림톡 없이 현장 확인용)
  partySize: number;
  hasInfant: boolean;
  seatPreference: WaitlistSeatPreference;
  status: WaitlistStatus;
  registeredAt: string; // ISO 8601
  calledAt?: string;
  seatedAt?: string;
}

export interface WaitlistQueueConfig {
  avgMinutesPerParty: number; // 팀당 평균 대기 소요분 (기본: 8분)
  roomBonusMinutes: number; // 룸 선호 시 추가 가중분 (기본: 12분)
  autoExpireCallMinutes: number; // 호출 후 미입장 시 노쇼 처리 기준 (기본: 10분)
}

export interface WaitlistBoardMetrics {
  totalWaitingCount: number;
  estimatedWaitMinutes: number;
  lastCalledTicket?: number;
  currentlyCalledTickets: number[];
  seatedTodayCount: number;
}

export const DEFAULT_WAITLIST_CONFIG: WaitlistQueueConfig = {
  avgMinutesPerParty: 8,
  roomBonusMinutes: 12,
  autoExpireCallMinutes: 10,
};

/**
 * 대기 팀 수와 좌석 선호도에 따른 예상 대기 시간(분)을 계산합니다.
 */
export function estimateWaitTimeMinutes(
  waitingEntries: WaitlistEntry[],
  preference: WaitlistSeatPreference = 'any',
  config: WaitlistQueueConfig = DEFAULT_WAITLIST_CONFIG
): number {
  const activeWaiting = waitingEntries.filter((e) => e.status === 'waiting');
  if (activeWaiting.length === 0) return 0;

  // 동일 선호 또는 any 대상 팀 필터
  const relevantCount = activeWaiting.filter(
    (e) => preference === 'any' || e.seatPreference === 'any' || e.seatPreference === preference
  ).length;

  let baseTime = relevantCount * config.avgMinutesPerParty;
  if (preference === 'room') {
    baseTime += config.roomBonusMinutes;
  }
  return Math.max(5, baseTime);
}

/**
 * 신규 대기표를 발권 등록합니다.
 */
export function registerWaitlistEntry(
  currentEntries: WaitlistEntry[],
  params: {
    customerName: string;
    phoneLastDigits: string;
    partySize: number;
    hasInfant: boolean;
    seatPreference: WaitlistSeatPreference;
  }
): { newEntry: WaitlistEntry; updatedEntries: WaitlistEntry[] } {
  const maxTicket = currentEntries.reduce((max, e) => Math.max(max, e.ticketNumber), 0);
  const nextTicket = maxTicket >= 999 ? 1 : maxTicket + 1;

  const newEntry: WaitlistEntry = {
    id: `wait_${Date.now()}_${nextTicket}`,
    ticketNumber: nextTicket,
    customerName: params.customerName.trim(),
    phoneLastDigits: params.phoneLastDigits.replace(/\D/g, '').slice(-4),
    partySize: Math.max(1, params.partySize),
    hasInfant: params.hasInfant,
    seatPreference: params.seatPreference,
    status: 'waiting',
    registeredAt: new Date().toISOString(),
  };

  return {
    newEntry,
    updatedEntries: [...currentEntries, newEntry],
  };
}

/**
 * 고객을 입장 호출합니다.
 */
export function callWaitlistEntry(
  entries: WaitlistEntry[],
  entryId: string
): WaitlistEntry[] {
  return entries.map((e) => {
    if (e.id !== entryId) return e;
    return {
      ...e,
      status: 'called',
      calledAt: new Date().toISOString(),
    };
  });
}

/**
 * 고객 착석(입장 완료) 처리합니다.
 */
export function seatWaitlistEntry(
  entries: WaitlistEntry[],
  entryId: string
): WaitlistEntry[] {
  return entries.map((e) => {
    if (e.id !== entryId) return e;
    return {
      ...e,
      status: 'seated',
      seatedAt: new Date().toISOString(),
    };
  });
}

/**
 * 대기 취소 또는 노쇼 처리합니다.
 */
export function changeWaitlistStatus(
  entries: WaitlistEntry[],
  entryId: string,
  newStatus: 'cancelled' | 'no_show'
): WaitlistEntry[] {
  return entries.map((e) => {
    if (e.id !== entryId) return e;
    return {
      ...e,
      status: newStatus,
    };
  });
}

/**
 * 매장 DID TV 및 전광판용 지표와 호출 현황을 집계합니다.
 */
export function calculateBoardMetrics(
  entries: WaitlistEntry[],
  config: WaitlistQueueConfig = DEFAULT_WAITLIST_CONFIG
): WaitlistBoardMetrics {
  const waiting = entries.filter((e) => e.status === 'waiting');
  const called = entries.filter((e) => e.status === 'called');
  const seated = entries.filter((e) => e.status === 'seated');

  const currentlyCalledTickets = called.map((e) => e.ticketNumber);
  const lastCalledTicket = currentlyCalledTickets.length > 0 ? currentlyCalledTickets[currentlyCalledTickets.length - 1] : undefined;

  return {
    totalWaitingCount: waiting.length,
    estimatedWaitMinutes: estimateWaitTimeMinutes(entries, 'any', config),
    lastCalledTicket,
    currentlyCalledTickets,
    seatedTodayCount: seated.length,
  };
}
