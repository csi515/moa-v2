/**
 * 자동화 리텐션 및 이탈 방지 마케팅 엔진 (Pure Functions)
 *
 * 적용 업종: 전 업종 공통 (피트니스, 필라테스, 학원, 미용/뷰티, 정비, 세차 등)
 * 주요 기능:
 *  1. D-Day 만료 감지 (수강권·회원권 만료 D-7, D-3, 사물함 만료 등)
 *  2. 시술/케어 주기(treatment_chart) 기반 재방문 예정일 도래 감지
 *  3. 장기 미방문/결석 고객 감지
 *  4. 템플릿 변수 치환 ({고객명}, {만료일}, {남은일수}, {사업장}) 및 쿨다운 중복 방지 발송 큐 생성
 */

export type RetentionTriggerType =
  | 'PASS_EXPIRING' // 수강권/회원권 만료 예고
  | 'LOCKER_EXPIRING' // 사물함 만료 예고
  | 'TREATMENT_DUE' // 시술 주기 도래
  | 'LONG_TIME_ABSENT'; // 장기 미출석

export interface RetentionCandidate {
  id: string; // 고유 키 (예: 'pass-101' 또는 'cust-202')
  customerId: string;
  customerName: string;
  customerPhone?: string;
  triggerType: RetentionTriggerType;
  referenceDate: string; // YYYY-MM-DD (만료일 또는 예정일)
  daysRemaining: number; // 양수: D-day 이전, 음수: 기한 초과
  metadata?: Record<string, unknown>;
}

export interface MessageTemplate {
  triggerType: RetentionTriggerType;
  title: string;
  body: string; // e.g. "안녕하세요 {고객명}님, {사업장명}입니다. 수강권이 {남은일수}일 후 만료됩니다."
}

export interface MarketingDispatchItem {
  id: string;
  candidateId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  triggerType: RetentionTriggerType;
  messageText: string;
  scheduledDate: string; // YYYY-MM-DD
  status: 'pending' | 'sent' | 'cancelled';
}

export interface DispatchHistoryItem {
  customerId: string;
  triggerType: RetentionTriggerType;
  sentAt: string; // ISO string
}

/**
 * 1. 수강권/회원권 만료 임박 대상자 판정 (순수 함수)
 */
export function scanExpiringPasses(params: {
  passes: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    endDate: string; // YYYY-MM-DD
    status?: string;
  }>;
  currentDate: string; // YYYY-MM-DD
  targetDaysWindow?: number[]; // default: [7, 3, 1, 0]
}): RetentionCandidate[] {
  const { passes, currentDate, targetDaysWindow = [7, 3, 1, 0] } = params;
  const currentMs = new Date(currentDate).getTime();
  const results: RetentionCandidate[] = [];

  for (const pass of passes) {
    if (pass.status === 'expired' || pass.status === 'cancelled') continue;
    if (!pass.endDate) continue;

    const endMs = new Date(pass.endDate).getTime();
    const daysRemaining = Math.ceil((endMs - currentMs) / (1000 * 3600 * 24));

    if (targetDaysWindow.includes(daysRemaining)) {
      results.push({
        id: `pass:${pass.id}:${daysRemaining}`,
        customerId: pass.customerId,
        customerName: pass.customerName,
        customerPhone: pass.customerPhone,
        triggerType: 'PASS_EXPIRING',
        referenceDate: pass.endDate,
        daysRemaining,
      });
    }
  }

  return results;
}

/**
 * 2. 시술/케어 주기 도래 고객 판정 (순수 함수)
 */
export function scanDueTreatments(params: {
  treatments: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    lastPerformedDate: string; // YYYY-MM-DD
    cycleWeeks: number; // e.g. 4
  }>;
  currentDate: string; // YYYY-MM-DD
}): RetentionCandidate[] {
  const { treatments, currentDate } = params;
  const currentMs = new Date(currentDate).getTime();
  const results: RetentionCandidate[] = [];

  for (const t of treatments) {
    const lastMs = new Date(t.lastPerformedDate).getTime();
    const targetMs = lastMs + t.cycleWeeks * 7 * 24 * 3600 * 1000;
    const daysRemaining = Math.ceil((targetMs - currentMs) / (1000 * 3600 * 24));

    // 예정일 3일 전부터 당일까지 도래로 판정
    if (daysRemaining >= 0 && daysRemaining <= 3) {
      results.push({
        id: `treatment:${t.id}:${daysRemaining}`,
        customerId: t.customerId,
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        triggerType: 'TREATMENT_DUE',
        referenceDate: new Date(targetMs).toISOString().slice(0, 10),
        daysRemaining,
      });
    }
  }

  return results;
}

/**
 * 3. 템플릿 변수 치환 함수
 */
export function interpolateTemplate(
  templateStr: string,
  variables: {
    customerName: string;
    workplaceName: string;
    daysRemaining: number;
    referenceDate: string;
  }
): string {
  return templateStr
    .replace(/{고객명}/g, variables.customerName)
    .replace(/{사업장명}/g, variables.workplaceName)
    .replace(/{남은일수}/g, String(Math.max(0, variables.daysRemaining)))
    .replace(/{만료일}/g, variables.referenceDate)
    .replace(/{예정일}/g, variables.referenceDate);
}

/**
 * 4. 발송 큐 생성 및 쿨다운 중복 방지 (순수 함수)
 */
export function generateMarketingDispatchQueue(params: {
  candidates: readonly RetentionCandidate[];
  templates: readonly MessageTemplate[];
  history: readonly DispatchHistoryItem[];
  currentDate: string; // YYYY-MM-DD
  workplaceName: string;
  cooldownDays?: number; // default: 7일 내 동일 트리거 재발송 방지
}): MarketingDispatchItem[] {
  const {
    candidates,
    templates,
    history,
    currentDate,
    workplaceName,
    cooldownDays = 7,
  } = params;

  const templateMap = new Map<RetentionTriggerType, MessageTemplate>();
  templates.forEach((t) => templateMap.set(t.triggerType, t));

  const currentMs = new Date(currentDate).getTime();
  const cooldownMs = cooldownDays * 24 * 3600 * 1000;

  const queue: MarketingDispatchItem[] = [];

  for (const cand of candidates) {
    // 쿨다운 검사: 동일 고객에게 동일 트리거로 cooldownDays 이내 발송된 이력이 있으면 스킵
    const isUnderCooldown = history.some((h) => {
      if (h.customerId !== cand.customerId || h.triggerType !== cand.triggerType) return false;
      const sentMs = new Date(h.sentAt).getTime();
      return currentMs - sentMs < cooldownMs;
    });

    if (isUnderCooldown) continue;

    const tpl = templateMap.get(cand.triggerType);
    const bodyTemplate = tpl
      ? tpl.body
      : `안녕하세요 {고객명}님, {사업장명}입니다. ({남은일수}일 안내)`;

    const messageText = interpolateTemplate(bodyTemplate, {
      customerName: cand.customerName,
      workplaceName,
      daysRemaining: cand.daysRemaining,
      referenceDate: cand.referenceDate,
    });

    queue.push({
      id: `dispatch:${cand.id}`,
      candidateId: cand.id,
      customerId: cand.customerId,
      customerName: cand.customerName,
      customerPhone: cand.customerPhone || '010-0000-0000',
      triggerType: cand.triggerType,
      messageText,
      scheduledDate: currentDate,
      status: 'pending',
    });
  }

  return queue;
}
