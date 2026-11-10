import {
  issueMakeupToken,
  evaluateTokenValidity,
  type MakeupToken,
} from '../domain/makeupLessonEngine';

const STORAGE_KEY_TOKENS = 'moa_makeup_tokens';
const STORAGE_KEY_REQUESTS = 'moa_makeup_requests';

export type MakeupRequestStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export interface MakeupRequest {
  id: string;
  organizationId: string;
  tokenId: string;
  studentId: string;
  studentName: string;
  originDate: string; // 결석 일자
  preferredDate: string; // 희망 보강 일자 YYYY-MM-DD
  preferredTime: string; // 희망 보강 시간 HH:MM
  memo?: string;
  status: MakeupRequestStatus;
  createdAt: string; // ISO
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * 로컬스토리지에서 보강 토큰 전체 목록을 로드합니다.
 */
export function loadMakeupTokens(): MakeupToken[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_TOKENS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[makeupLessonStorage] Failed to load makeup tokens:', error);
    return [];
  }
}

/**
 * 보강 토큰 전체 목록을 로컬스토리지에 저장합니다.
 */
export function saveMakeupTokens(tokens: MakeupToken[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('[makeupLessonStorage] Failed to save makeup tokens:', error);
  }
}

/**
 * 학생에게 새 보강 토큰을 발행하고 스토리지에 원자적으로 저장합니다.
 */
export function issueAndSaveMakeupToken(params: {
  studentId: string;
  studentName: string;
  originReason: 'absence' | 'advance_request' | 'instructor_cancel';
  originDate: string;
  validityDays?: number;
  organizationId?: string;
}): MakeupToken {
  const token = issueMakeupToken({
    id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: params.organizationId ?? 'default-org',
    studentId: params.studentId,
    studentName: params.studentName,
    originReason: params.originReason,
    originDate: params.originDate,
    validityDays: params.validityDays ?? 30,
  });

  const current = loadMakeupTokens();
  saveMakeupTokens([token, ...current]);
  return token;
}

/**
 * 특정 학생의 결석 일자(originDate)에 대해 이미 발급된 유효한 토큰이 있는지 조회합니다.
 * organizationId가 제공되면 해당 학원으로 격리 필터링합니다.
 */
export function findActiveMakeupTokenForAbsence(
  studentId: string,
  originDate: string,
  organizationId?: string,
  currentDateStr: string = new Date().toISOString().slice(0, 10)
): { token: MakeupToken; daysRemaining: number } | null {
  const all = loadMakeupTokens();
  const matched = all.find(
    (t) =>
      t.studentId === studentId &&
      t.originDate === originDate &&
      (!organizationId || t.organizationId === organizationId) &&
      (t.status === 'available' || t.status === 'reserved')
  );

  if (!matched) return null;

  const validity = evaluateTokenValidity(matched, currentDateStr);
  if (validity.isExpired) return null;

  return { token: matched, daysRemaining: validity.daysRemaining };
}

/**
 * 특정 학생이 보유한 사용 가능한(available) 보강 토큰 목록을 조회합니다.
 * organizationId가 제공되면 해당 학원으로 격리 필터링합니다 (학부모 앱 멀티 테넌트 대응).
 */
export function getAvailableMakeupTokensForStudent(
  studentId: string,
  organizationId?: string,
  currentDateStr: string = new Date().toISOString().slice(0, 10)
): Array<MakeupToken & { daysRemaining: number }> {
  const all = loadMakeupTokens();
  return all
    .filter(
      (t) =>
        t.studentId === studentId &&
        (!organizationId || t.organizationId === organizationId) &&
        (t.status === 'available' || t.status === 'reserved')
    )
    .map((t) => {
      const validity = evaluateTokenValidity(t, currentDateStr);
      return { ...t, daysRemaining: validity.daysRemaining, isExpired: validity.isExpired };
    })
    .filter((t) => !t.isExpired);
}

// ==========================================
// 보강 신청 요청(Makeup Request) 관리 함수
// ==========================================

/**
 * 보강 신청 요청 목록 로드
 */
export function loadMakeupRequests(): MakeupRequest[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[makeupLessonStorage] Failed to load makeup requests:', error);
    return [];
  }
}

/**
 * 보강 신청 요청 목록 저장
 */
export function saveMakeupRequests(requests: MakeupRequest[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  } catch (error) {
    console.error('[makeupLessonStorage] Failed to save makeup requests:', error);
  }
}

/**
 * 학부모가 보강권을 사용하여 새 보강 신청을 등록합니다.
 */
export function createMakeupRequest(params: {
  organizationId: string;
  tokenId: string;
  studentId: string;
  studentName: string;
  originDate: string;
  preferredDate: string;
  preferredTime: string;
  memo?: string;
}): MakeupRequest {
  const request: MakeupRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: params.organizationId,
    tokenId: params.tokenId,
    studentId: params.studentId,
    studentName: params.studentName,
    originDate: params.originDate,
    preferredDate: params.preferredDate,
    preferredTime: params.preferredTime,
    memo: params.memo?.trim() || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const requests = loadMakeupRequests();
  saveMakeupRequests([request, ...requests]);
  return request;
}

/**
 * 특정 학원의 대기 중(pending)인 보강 신청 목록을 조회합니다 (원장님용).
 */
export function getPendingMakeupRequests(organizationId: string): MakeupRequest[] {
  const requests = loadMakeupRequests();
  return requests.filter(
    (r) => r.organizationId === organizationId && r.status === 'pending'
  );
}

/**
 * 특정 학생의 보강 신청 내역을 조회합니다 (학부모용).
 */
export function getMakeupRequestsForStudent(
  organizationId: string,
  studentId: string
): MakeupRequest[] {
  const requests = loadMakeupRequests();
  return requests.filter(
    (r) => r.organizationId === organizationId && r.studentId === studentId
  );
}

/**
 * 원장님이 보강 신청을 승인합니다.
 * 보강권 상태가 'reserved'로 변경됩니다.
 */
export function approveMakeupRequest(
  requestId: string,
  reviewerName: string = '원장님'
): { request: MakeupRequest; token: MakeupToken } | null {
  const requests = loadMakeupRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const targetReq = requests[reqIndex];
  const updatedReq: MakeupRequest = {
    ...targetReq,
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerName,
  };
  requests[reqIndex] = updatedReq;
  saveMakeupRequests(requests);

  // 연관된 토큰의 상태를 'reserved'로 전이
  const tokens = loadMakeupTokens();
  const tokenIndex = tokens.findIndex((t) => t.id === targetReq.tokenId);
  let updatedToken: MakeupToken;

  if (tokenIndex !== -1) {
    updatedToken = {
      ...tokens[tokenIndex],
      status: 'reserved',
    };
    tokens[tokenIndex] = updatedToken;
    saveMakeupTokens(tokens);
  } else {
    // 토큰이 이미 reserved이거나 미존재 시 가상 토큰
    updatedToken = {
      id: targetReq.tokenId,
      organizationId: targetReq.organizationId,
      studentId: targetReq.studentId,
      studentName: targetReq.studentName,
      originReason: 'advance_request',
      originDate: targetReq.originDate,
      expiresAt: '',
      status: 'reserved',
    };
  }

  return { request: updatedReq, token: updatedToken };
}

/**
 * 원장님이 보강 신청을 반려합니다.
 */
export function rejectMakeupRequest(
  requestId: string,
  reason: string,
  reviewerName: string = '원장님'
): MakeupRequest | null {
  const requests = loadMakeupRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return null;

  const updatedReq: MakeupRequest = {
    ...requests[reqIndex],
    status: 'rejected',
    rejectionReason: reason,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerName,
  };
  requests[reqIndex] = updatedReq;
  saveMakeupRequests(requests);

  return updatedReq;
}
