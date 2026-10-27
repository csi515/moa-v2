/**
 * 안심 통학 & 셔틀 차량 운행 관제 순수 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 학원 8종, 어린이집(daycare), 수영장(swim_school) 등
 * 주요 기능:
 *  1. 차량별 노선(코스) 정류장 순서 정규화 및 소요시간 계산
 *  2. 다음 정류장 도착 사전 안내 대상 학부모 선별 (도착 3분 전 알림 트리거)
 *  3. 기사용 승·하차 체크 상태머신 및 당일 운행 통계 집계
 */

export interface ShuttleStop {
  id: string;
  name: string; // e.g. "푸르지오 아파트 정문", "한양마트 앞"
  sequenceOrder: number; // 1, 2, 3...
  scheduledMinutesFromStart: number; // 출발 후 몇 분 뒤 도착 예정인지 (e.g. 5분, 12분)
  assignedStudentIds: string[];
}

export interface ShuttleRoute {
  id: string;
  vehicleName: string; // e.g. "1호차 (스타리아)"
  routeName: string; // e.g. "A코스 (등원 1회차)"
  driverName: string;
  driverPhone: string;
  departureTime: string; // HH:mm (e.g. "14:30")
  stops: ShuttleStop[];
}

export type BoardingStatus = 'SCHEDULED' | 'BOARDED' | 'ALIGHTED' | 'ABSENT';

export interface BoardingCheckRecord {
  studentId: string;
  stopId: string;
  status: BoardingStatus;
  timestamp: string; // ISO string
  note?: string;
}

export interface RouteOperationSummary {
  totalAssignedStudents: number;
  boardedCount: number;
  alightedCount: number;
  absentCount: number;
  currentStopIndex: number;
  isCompleted: boolean;
}

/**
 * 1. 노선 정류장 순서 및 소요시간 정규화 (순수 함수)
 */
export function normalizeRouteStops(stops: readonly ShuttleStop[]): ShuttleStop[] {
  return [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
}

/**
 * 2. 다음 정류장 도착 안내 대상 학부모 선별 (순수 함수)
 *    기사가 특정 정류장에 도착하거나 출발했을 때, 다음 정류장에 3분 이내 도착 예정인지 판정
 */
export function evaluateUpcomingArrivalNotice(params: {
  stops: readonly ShuttleStop[];
  currentStopIndex: number;
  elapsedMinutesSinceDeparture: number;
  noticeThresholdMinutes?: number; // default: 3분 전
}): {
  nextStop: ShuttleStop | null;
  targetStudentIds: string[];
  minutesRemainingToNextStop: number;
  shouldNotify: boolean;
} {
  const {
    stops,
    currentStopIndex,
    elapsedMinutesSinceDeparture,
    noticeThresholdMinutes = 3,
  } = params;

  const sortedStops = normalizeRouteStops(stops);
  const nextStopIndex = currentStopIndex + 1;

  if (nextStopIndex >= sortedStops.length) {
    return {
      nextStop: null,
      targetStudentIds: [],
      minutesRemainingToNextStop: 0,
      shouldNotify: false,
    };
  }

  const nextStop = sortedStops[nextStopIndex];
  const minutesRemaining = Math.max(
    0,
    nextStop.scheduledMinutesFromStart - elapsedMinutesSinceDeparture
  );

  const shouldNotify = minutesRemaining <= noticeThresholdMinutes;

  return {
    nextStop,
    targetStudentIds: shouldNotify ? nextStop.assignedStudentIds : [],
    minutesRemainingToNextStop: minutesRemaining,
    shouldNotify,
  };
}

/**
 * 3. 당일 셔틀 운행 실시간 통계 집계 (순수 함수)
 */
export function summarizeRouteOperation(params: {
  stops: readonly ShuttleStop[];
  boardingLogs: readonly BoardingCheckRecord[];
  currentStopIndex: number;
}): RouteOperationSummary {
  const { stops, boardingLogs, currentStopIndex } = params;

  const allAssignedStudentIds = new Set<string>();
  stops.forEach((s) => s.assignedStudentIds.forEach((id) => allAssignedStudentIds.add(id)));

  let boardedCount = 0;
  let alightedCount = 0;
  let absentCount = 0;

  const latestStatusMap = new Map<string, BoardingStatus>();
  boardingLogs.forEach((log) => latestStatusMap.set(log.studentId, log.status));

  latestStatusMap.forEach((status) => {
    if (status === 'BOARDED') boardedCount++;
    else if (status === 'ALIGHTED') alightedCount++;
    else if (status === 'ABSENT') absentCount++;
  });

  const isCompleted = currentStopIndex >= stops.length - 1;

  return {
    totalAssignedStudents: allAssignedStudentIds.size,
    boardedCount,
    alightedCount,
    absentCount,
    currentStopIndex,
    isCompleted,
  };
}
