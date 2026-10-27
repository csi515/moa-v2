/**
 * Shuttle Commute Domain Engine (Pure Business Logic)
 *
 * 임직원 출퇴근 셔틀버스 탑승 신청, 정류장 정차 순서 스케줄링, 버스 기사용 모바일 탑승 체크 순수 함수
 */

export type CommuteDirection = 'commute_in' | 'commute_out'; // 출근 | 퇴근
export type CommuteRideType = 'regular' | 'single'; // 매일 정기 | 1회성
export type CommuteRequestStatus = 'active' | 'cancelled';
export type CommuteBoardingStatus = 'SCHEDULED' | 'BOARDED' | 'ABSENT';

export interface StaffRideInfo {
  requestId: string;
  staffId: string;
  staffName: string;
  staffPhone: string;
  departmentName?: string;
  rideType: CommuteRideType;
  rideDate?: string;
  boardingStatus: CommuteBoardingStatus;
}

export interface CommuteStop {
  id: string;
  routeId: string;
  stopName: string;
  sequenceOrder: number; // 1, 2, 3...
  scheduledMinutesFromStart: number; // 출발지 기준 소요 분
  assignedStaff?: StaffRideInfo[];
}

export interface CommuteRoute {
  id: string;
  organizationId: string;
  vehicleName: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  departureTime: string; // HH:mm
  direction: CommuteDirection;
  stops: CommuteStop[];
}

export interface StaffRideRequest {
  id: string;
  organizationId: string;
  staffId: string;
  staffName: string;
  staffPhone: string;
  departmentName?: string;
  routeId: string;
  stopId: string;
  rideType: CommuteRideType;
  rideDate?: string; // single인 경우 필수 (YYYY-MM-DD)
  status: CommuteRequestStatus;
  createdAt: string;
}

export interface CommuteOperationSummary {
  totalAssignedStaff: number;
  boardedCount: number;
  scheduledCount: number;
  currentStopIndex: number;
  isCompleted: boolean;
  emptyStopsCount: number;
}

/**
 * 1. 정류장 순서(sequenceOrder) 정규화
 */
export function normalizeCommuteStops(stops: readonly CommuteStop[]): CommuteStop[] {
  return [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

/**
 * 2. 정류장 순서 재정렬 및 sequenceOrder 자동 재부여
 */
export function reorderCommuteStops(
  stops: readonly CommuteStop[],
  sourceIndex: number,
  targetIndex: number
): CommuteStop[] {
  const sorted = normalizeCommuteStops(stops);
  if (
    sourceIndex < 0 ||
    sourceIndex >= sorted.length ||
    targetIndex < 0 ||
    targetIndex >= sorted.length ||
    sourceIndex === targetIndex
  ) {
    return sorted;
  }

  const result = [...sorted];
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(targetIndex, 0, removed);

  return result.map((stop, index) => ({
    ...stop,
    sequenceOrder: index + 1,
  }));
}

/**
 * 3. 정류장별 탑승 신청 임직원 자동 매핑 및 탑승 상태 반영
 */
export function mapStaffToCommuteStops(
  stops: readonly CommuteStop[],
  requests: readonly StaffRideRequest[],
  boardingStatusMap: Readonly<Record<string, CommuteBoardingStatus>> = {}
): CommuteStop[] {
  const sortedStops = normalizeCommuteStops(stops);

  return sortedStops.map((stop) => {
    const matchedRequests = requests.filter(
      (r) => r.stopId === stop.id && r.status === 'active'
    );

    const assignedStaff: StaffRideInfo[] = matchedRequests.map((req) => ({
      requestId: req.id,
      staffId: req.staffId,
      staffName: req.staffName,
      staffPhone: req.staffPhone,
      departmentName: req.departmentName,
      rideType: req.rideType,
      rideDate: req.rideDate,
      boardingStatus: boardingStatusMap[req.id] || 'SCHEDULED',
    }));

    return {
      ...stop,
      assignedStaff,
    };
  });
}

/**
 * 4. 탑승 신청자가 0명인 정류장 판별 (무정차 통과 가능)
 */
export function isCommuteStopEmpty(stop: CommuteStop): boolean {
  return !stop.assignedStaff || stop.assignedStaff.length === 0;
}

/**
 * 5. 노선 방향(출근/퇴근) 필터링
 */
export function filterCommuteRoutes(
  routes: readonly CommuteRoute[],
  direction?: CommuteDirection
): CommuteRoute[] {
  if (!direction) return [...routes];
  return routes.filter((r) => r.direction === direction);
}

/**
 * 6. 기사 운행 통계 요약 산출
 */
export function summarizeCommuteOperation(
  stops: readonly CommuteStop[],
  currentStopIndex: number
): CommuteOperationSummary {
  let totalAssignedStaff = 0;
  let boardedCount = 0;
  let scheduledCount = 0;
  let emptyStopsCount = 0;

  stops.forEach((stop) => {
    const staffList = stop.assignedStaff || [];
    if (staffList.length === 0) {
      emptyStopsCount++;
    } else {
      totalAssignedStaff += staffList.length;
      staffList.forEach((s) => {
        if (s.boardingStatus === 'BOARDED') {
          boardedCount++;
        } else {
          scheduledCount++;
        }
      });
    }
  });

  const isCompleted = currentStopIndex >= stops.length - 1;

  return {
    totalAssignedStaff,
    boardedCount,
    scheduledCount,
    currentStopIndex,
    isCompleted,
    emptyStopsCount,
  };
}

/**
 * 7. 임직원 탑승 신청 유효성 검증
 */
export function validateCommuteRideRequest(params: {
  staffId: string;
  staffName: string;
  routeId: string;
  stopId: string;
  rideType: CommuteRideType;
  rideDate?: string;
}): { valid: boolean; error?: string } {
  if (!params.staffId || !params.staffId.trim()) {
    return { valid: false, error: '임직원 정보(staffId)가 필요합니다.' };
  }
  if (!params.staffName || !params.staffName.trim()) {
    return { valid: false, error: '신청자 성명을 입력해주세요.' };
  }
  if (!params.routeId) {
    return { valid: false, error: '탑승할 셔틀 노선을 선택해주세요.' };
  }
  if (!params.stopId) {
    return { valid: false, error: '탑승 또는 하차할 정류장을 선택해주세요.' };
  }
  if (params.rideType === 'single' && !params.rideDate) {
    return { valid: false, error: '1회 탑승인 경우 탑승 희망일을 지정해주세요.' };
  }

  return { valid: true };
}
