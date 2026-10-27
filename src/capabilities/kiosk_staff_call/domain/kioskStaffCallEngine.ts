export type StaffCallRequestType =
  | 'water_dishes' // 물/식기 추가
  | 'temperature' // 냉난방 온도 조절
  | 'equipment_issue' // 장비/PC/골프센서 오류
  | 'cleaning' // 좌석/룸 청소 요청
  | 'silent_report' // 무음 민원 접수 (소음 신고 등)
  | 'general'; // 기타 직원 호출

export type StaffCallStatus = 'pending' | 'in_progress' | 'resolved';

export interface StaffCallRequest {
  id: string;
  roomOrSeatNumber: string; // 예: "룸 3번", "타석 7번", "자유석 24"
  requestType: StaffCallRequestType;
  message: string;
  isSilent: boolean; // 소리 없는 정숙 민원 여부
  status: StaffCallStatus;
  createdAt: string; // ISO
  resolvedAt?: string;
  resolvedByStaffName?: string;
}

export interface StaffCallMetrics {
  totalPendingCount: number;
  silentReportCount: number;
  inProgressCount: number;
  resolvedTodayCount: number;
}

export const CALL_TYPE_LABELS: Record<StaffCallRequestType, string> = {
  water_dishes: '물/식기 추가',
  temperature: '온도/냉난방 조절',
  equipment_issue: '기기/센서 오류',
  cleaning: '청소/정리 요청',
  silent_report: '무음 소음 민원',
  general: '직원 호출',
};

/**
 * 좌석/룸 태블릿에서 새로운 직원 호출 요청을 생성합니다.
 */
export function createStaffCallRequest(params: {
  roomOrSeatNumber: string;
  requestType: StaffCallRequestType;
  customMessage?: string;
  isSilent?: boolean;
}): StaffCallRequest {
  const isSilent = params.isSilent ?? (params.requestType === 'silent_report');
  const defaultLabel = CALL_TYPE_LABELS[params.requestType];
  const message = params.customMessage?.trim() || defaultLabel;

  return {
    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    roomOrSeatNumber: params.roomOrSeatNumber.trim(),
    requestType: params.requestType,
    message,
    isSilent,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 직원이 호출을 접수(처리 중) 또는 완료 상태로 변경합니다.
 */
export function updateStaffCallStatus(
  requests: StaffCallRequest[],
  requestId: string,
  newStatus: StaffCallStatus,
  staffName?: string
): StaffCallRequest[] {
  return requests.map((req) => {
    if (req.id !== requestId) return req;
    return {
      ...req,
      status: newStatus,
      resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : req.resolvedAt,
      resolvedByStaffName: staffName || req.resolvedByStaffName,
    };
  });
}

/**
 * 실시간 디지털 벨보드 요약 지표를 산출합니다.
 */
export function calculateStaffCallMetrics(requests: StaffCallRequest[]): StaffCallMetrics {
  let totalPendingCount = 0;
  let silentReportCount = 0;
  let inProgressCount = 0;
  let resolvedTodayCount = 0;

  for (const req of requests) {
    if (req.status === 'pending') {
      totalPendingCount++;
      if (req.isSilent) silentReportCount++;
    } else if (req.status === 'in_progress') {
      inProgressCount++;
    } else if (req.status === 'resolved') {
      resolvedTodayCount++;
    }
  }

  return {
    totalPendingCount,
    silentReportCount,
    inProgressCount,
    resolvedTodayCount,
  };
}
