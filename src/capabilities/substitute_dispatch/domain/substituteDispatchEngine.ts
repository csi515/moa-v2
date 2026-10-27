/**
 * 강사·직원 대진/대강 요청 및 원클릭 승인 도메인 엔진
 *
 * 비용 0원 원칙: 단톡방 공유 메시지 조립 및 순수 상태 머신
 */

export type RequestStatus = 'open' | 'applied' | 'approved' | 'rejected' | 'completed' | 'canceled';
export type BidStatus = 'pending' | 'selected' | 'rejected';

export interface SubstituteRequest {
  id: string;
  organizationId: string;
  requesterStaffId: string;
  requesterName: string;
  className: string;
  targetDate: string; // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  reason: 'illness' | 'family_event' | 'personal' | 'vacation';
  reasonDetail?: string | null;
  payRateType: 'hourly' | 'fixed_per_class';
  offeredFee: number;
  assignedStaffId?: string | null;
  assignedName?: string | null;
  status: RequestStatus;
  approvedAt?: string | null;
  createdAt: string;
}

export interface SubstituteBid {
  id: string;
  organizationId: string;
  requestId: string;
  candidateStaffId: string;
  candidateName: string;
  bidMessage?: string | null;
  status: BidStatus;
  createdAt: string;
}

/**
 * 1. 신규 대강 요청 생성
 */
export function createSubstituteRequest(params: {
  id: string;
  organizationId: string;
  requesterStaffId: string;
  requesterName: string;
  className: string;
  targetDate: string;
  startTime: string;
  endTime: string;
  reason: 'illness' | 'family_event' | 'personal' | 'vacation';
  reasonDetail?: string | null;
  payRateType?: 'hourly' | 'fixed_per_class';
  offeredFee?: number;
}): SubstituteRequest {
  return {
    id: params.id,
    organizationId: params.organizationId,
    requesterStaffId: params.requesterStaffId,
    requesterName: params.requesterName,
    className: params.className,
    targetDate: params.targetDate,
    startTime: params.startTime,
    endTime: params.endTime,
    reason: params.reason,
    reasonDetail: params.reasonDetail,
    payRateType: params.payRateType ?? 'hourly',
    offeredFee: params.offeredFee ?? 30000,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 2. 동료 강사 대강 지원(Bid) 등록
 */
export function applySubstituteBid(
  request: SubstituteRequest,
  candidate: { id: string; staffId: string; name: string; message?: string }
): {
  bid: SubstituteBid;
  updatedRequest: SubstituteRequest;
} {
  if (request.status !== 'open' && request.status !== 'applied') {
    throw new Error(`지원할 수 없는 대강 공고 상태입니다: ${request.status}`);
  }

  const bid: SubstituteBid = {
    id: candidate.id,
    organizationId: request.organizationId,
    requestId: request.id,
    candidateStaffId: candidate.staffId,
    candidateName: candidate.name,
    bidMessage: candidate.message,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const updatedRequest: SubstituteRequest = {
    ...request,
    status: 'applied',
  };

  return { bid, updatedRequest };
}

/**
 * 3. 관리자/원장의 특정 강사 대강 승인 및 상태 전이
 */
export function approveSubstituteBid(
  request: SubstituteRequest,
  selectedBid: SubstituteBid,
  allBids: SubstituteBid[]
): {
  approvedRequest: SubstituteRequest;
  updatedBids: SubstituteBid[];
} {
  if (request.status === 'approved' || request.status === 'completed') {
    throw new Error('이미 승인 완료된 대강 공고입니다.');
  }

  const approvedRequest: SubstituteRequest = {
    ...request,
    assignedStaffId: selectedBid.candidateStaffId,
    assignedName: selectedBid.candidateName,
    status: 'approved',
    approvedAt: new Date().toISOString(),
  };

  const updatedBids = allBids.map((b) => ({
    ...b,
    status: (b.id === selectedBid.id ? 'selected' : 'rejected') as BidStatus,
  }));

  return { approvedRequest, updatedBids };
}

/**
 * 4. 사내 강사 단톡방 공유용 대강 긴급 공고 텍스트 조립
 */
export function assembleSubstituteBroadcastMessage(req: SubstituteRequest): string {
  const reasonText =
    req.reason === 'illness' ? '병가/건강상 이유' :
    req.reason === 'family_event' ? '경조사' :
    req.reason === 'vacation' ? '휴가' : '개인 사정';

  const feeText = req.payRateType === 'hourly'
    ? `시급 ${req.offeredFee.toLocaleString()}원`
    : `회당 ${req.offeredFee.toLocaleString()}원`;

  return [
    `[🚨 긴급 대강/대진 강사 모집 공고]`,
    `동료 선생님의 긴급 사정으로 대강 가능하신 분을 모십니다.`,
    ``,
    `■ 대상 수업: ${req.className}`,
    `■ 일시: ${req.targetDate} (${req.startTime} ~ ${req.endTime})`,
    `■ 사유: ${reasonText}`,
    `■ 강사료: ${feeText}`,
    `■ 요청 강사: ${req.requesterName} 선생님`,
    ``,
    `* 대강 가능하신 선생님께서는 시스템 또는 원장실로 즉시 지원 부탁드립니다.`,
  ].join('\n');
}
