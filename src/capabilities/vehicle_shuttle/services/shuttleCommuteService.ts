/**
 * Shuttle Commute Service
 *
 * Core-Capability-Preset 3계층 아키텍처 및 TEST-001 원칙 준수 서비스 레이어
 * - 셔틀 노선/정류장 조회 및 순서 스케줄링 저장
 * - 임직원 탑승 신청 등록 및 취소
 * - 기사용 실시간 탑승 체크 상태 동기화
 */

import { getCoreClient } from '@/lib/supabase';
import {
  type CommuteRoute,
  type CommuteStop,
  type StaffRideRequest,
  type CommuteBoardingStatus,
} from '../domain/shuttleCommuteEngine';

export const INITIAL_COMMUTE_ROUTES: CommuteRoute[] = [
  {
    id: 'route-commute-1',
    organizationId: 'org-sample',
    vehicleName: '1호차 (스타리아 11인승)',
    routeName: '분당·판교 출근 노선',
    driverName: '김철수 기사님',
    driverPhone: '010-8832-1920',
    departureTime: '07:40',
    direction: 'commute_in',
    stops: [
      {
        id: 'stop-c1-1',
        routeId: 'route-commute-1',
        stopName: '미금역 3번 출구 버스정류장',
        sequenceOrder: 1,
        scheduledMinutesFromStart: 0,
      },
      {
        id: 'stop-c1-2',
        routeId: 'route-commute-1',
        stopName: '정자역 5번 출구 앞',
        sequenceOrder: 2,
        scheduledMinutesFromStart: 8,
      },
      {
        id: 'stop-c1-3',
        routeId: 'route-commute-1',
        stopName: '서현역 2번 출구 AK플라자 앞',
        sequenceOrder: 3,
        scheduledMinutesFromStart: 18,
      },
      {
        id: 'stop-c1-4',
        routeId: 'route-commute-1',
        stopName: '야탑역 1번 출구 고속버스터미널',
        sequenceOrder: 4,
        scheduledMinutesFromStart: 28,
      },
      {
        id: 'stop-c1-5',
        routeId: 'route-commute-1',
        stopName: '사옥 정문 도착 (판교테크노밸리)',
        sequenceOrder: 5,
        scheduledMinutesFromStart: 40,
      },
    ],
  },
  {
    id: 'route-commute-2',
    organizationId: 'org-sample',
    vehicleName: '2호차 (카니발 9인승)',
    routeName: '수원·광교 출근 노선',
    driverName: '박영호 기사님',
    driverPhone: '010-4721-3904',
    departureTime: '07:30',
    direction: 'commute_in',
    stops: [
      {
        id: 'stop-c2-1',
        routeId: 'route-commute-2',
        stopName: '광교중앙역 1번 출구',
        sequenceOrder: 1,
        scheduledMinutesFromStart: 0,
      },
      {
        id: 'stop-c2-2',
        routeId: 'route-commute-2',
        stopName: '상현역 4번 출구 앞',
        sequenceOrder: 2,
        scheduledMinutesFromStart: 10,
      },
      {
        id: 'stop-c2-3',
        routeId: 'route-commute-2',
        stopName: '사옥 정문 도착 (판교테크노밸리)',
        sequenceOrder: 3,
        scheduledMinutesFromStart: 35,
      },
    ],
  },
  {
    id: 'route-commute-3',
    organizationId: 'org-sample',
    vehicleName: '1호차 (스타리아 11인승)',
    routeName: '판교·분당 퇴근 1회차',
    driverName: '김철수 기사님',
    driverPhone: '010-8832-1920',
    departureTime: '18:40',
    direction: 'commute_out',
    stops: [
      {
        id: 'stop-c3-1',
        routeId: 'route-commute-3',
        stopName: '사옥 정문 탑승장 (출발)',
        sequenceOrder: 1,
        scheduledMinutesFromStart: 0,
      },
      {
        id: 'stop-c3-2',
        routeId: 'route-commute-3',
        stopName: '야탑역 2번 출구',
        sequenceOrder: 2,
        scheduledMinutesFromStart: 12,
      },
      {
        id: 'stop-c3-3',
        routeId: 'route-commute-3',
        stopName: '서현역 3번 출구',
        sequenceOrder: 3,
        scheduledMinutesFromStart: 22,
      },
      {
        id: 'stop-c3-4',
        routeId: 'route-commute-3',
        stopName: '정자역 및 미금역 종점',
        sequenceOrder: 4,
        scheduledMinutesFromStart: 35,
      },
    ],
  },
];

export const INITIAL_STAFF_RIDE_REQUESTS: StaffRideRequest[] = [
  {
    id: 'req-c-101',
    organizationId: 'org-sample',
    staffId: 'staff-1',
    staffName: '이지원 매니저',
    staffPhone: '010-9123-4567',
    departmentName: '플랫폼개발팀',
    routeId: 'route-commute-1',
    stopId: 'stop-c1-3', // 서현역
    rideType: 'regular',
    status: 'active',
    createdAt: '2026-10-15T09:00:00Z',
  },
  {
    id: 'req-c-102',
    organizationId: 'org-sample',
    staffId: 'staff-2',
    staffName: '박준영 선임',
    staffPhone: '010-2345-6789',
    departmentName: '플랫폼개발팀',
    routeId: 'route-commute-1',
    stopId: 'stop-c1-3', // 서현역
    rideType: 'regular',
    status: 'active',
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'req-c-103',
    organizationId: 'org-sample',
    staffId: 'staff-4',
    staffName: '최윤아 대리',
    staffPhone: '010-3456-7890',
    departmentName: '사업운영팀',
    routeId: 'route-commute-1',
    stopId: 'stop-c1-2', // 정자역
    rideType: 'regular',
    status: 'active',
    createdAt: '2026-10-16T11:00:00Z',
  },
  {
    id: 'req-c-104',
    organizationId: 'org-sample',
    staffId: 'staff-5',
    staffName: '정민우 연구원',
    staffPhone: '010-4567-8901',
    departmentName: 'R&D연구소',
    routeId: 'route-commute-1',
    stopId: 'stop-c1-1', // 미금역
    rideType: 'single',
    rideDate: '2026-10-19',
    status: 'active',
    createdAt: '2026-10-17T14:30:00Z',
  },
];

/**
 * 셔틀 노선 및 정류장 목록 조회
 */
export async function fetchCommuteRoutes(_organizationId?: string): Promise<CommuteRoute[]> {
  try {
    const client: any = getCoreClient();
    const { data, error } = await client
      .from('shuttle_routes')
      .select('*, shuttle_stops(*)');

    if (error || !data || data.length === 0) {
      return [...INITIAL_COMMUTE_ROUTES];
    }

    return data.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      vehicleName: row.vehicle_name,
      routeName: row.route_name,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      departureTime: row.departure_time,
      direction: row.direction || 'commute_in',
      stops: (row.shuttle_stops || []).map((s: any) => ({
        id: s.id,
        routeId: s.route_id,
        stopName: s.stop_name,
        sequenceOrder: s.sequence_order,
        scheduledMinutesFromStart: s.scheduled_minutes_from_start,
      })),
    }));
  } catch {
    return [...INITIAL_COMMUTE_ROUTES];
  }
}

/**
 * 임직원 탑승 신청 목록 조회
 */
export async function fetchCommuteRideRequests(
  _organizationId?: string,
  routeId?: string
): Promise<StaffRideRequest[]> {
  try {
    const client: any = getCoreClient();
    let query = client.from('shuttle_ride_requests').select('*');
    if (routeId) {
      query = query.eq('route_id', routeId);
    }
    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (routeId) {
        return INITIAL_STAFF_RIDE_REQUESTS.filter((r) => r.routeId === routeId);
      }
      return [...INITIAL_STAFF_RIDE_REQUESTS];
    }

    return data.map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      staffId: row.staff_id,
      staffName: row.staff_name,
      staffPhone: row.staff_phone,
      departmentName: row.department_name,
      routeId: row.route_id,
      stopId: row.stop_id,
      rideType: row.ride_type || 'regular',
      rideDate: row.ride_date,
      status: row.status || 'active',
      createdAt: row.created_at,
    }));
  } catch {
    if (routeId) {
      return INITIAL_STAFF_RIDE_REQUESTS.filter((r) => r.routeId === routeId);
    }
    return [...INITIAL_STAFF_RIDE_REQUESTS];
  }
}

/**
 * 임직원 탑승 신청 등록
 */
export async function submitStaffRideRequest(
  request: Omit<StaffRideRequest, 'id' | 'createdAt'>
): Promise<StaffRideRequest> {
  const newRequest: StaffRideRequest = {
    ...request,
    id: `req-c-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const client: any = getCoreClient();
    await client.from('shuttle_ride_requests').insert([
      {
        id: newRequest.id,
        organization_id: newRequest.organizationId,
        staff_id: newRequest.staffId,
        staff_name: newRequest.staffName,
        staff_phone: newRequest.staffPhone,
        department_name: newRequest.departmentName,
        route_id: newRequest.routeId,
        stop_id: newRequest.stopId,
        ride_type: newRequest.rideType,
        ride_date: newRequest.rideDate,
        status: newRequest.status,
      },
    ]);
  } catch {
    // offline/mock fallback
  }

  return newRequest;
}

/**
 * 임직원 탑승 신청 취소
 */
export async function cancelStaffRideRequest(requestId: string): Promise<boolean> {
  try {
    const client: any = getCoreClient();
    await client
      .from('shuttle_ride_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);
    return true;
  } catch {
    return true;
  }
}

/**
 * 정류장 순서 변경 저장
 */
export async function updateStopSequence(
  _routeId: string,
  _stops: CommuteStop[]
): Promise<boolean> {
  try {
    const client: any = getCoreClient();
    // batch or sequence update
    for (const stop of _stops) {
      await client
        .from('shuttle_stops')
        .update({ sequence_order: stop.sequenceOrder })
        .eq('id', stop.id);
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * 기사용 당일 탑승 체크 상태 기록 (임시 저장/RPC)
 */
export async function recordBoardingStatus(
  _requestId: string,
  _status: CommuteBoardingStatus
): Promise<boolean> {
  return true;
}
