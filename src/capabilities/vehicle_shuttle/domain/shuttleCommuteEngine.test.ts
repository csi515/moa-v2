import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeCommuteStops,
  reorderCommuteStops,
  mapStaffToCommuteStops,
  isCommuteStopEmpty,
  filterCommuteRoutes,
  summarizeCommuteOperation,
  validateCommuteRideRequest,
  type CommuteStop,
  type CommuteRoute,
  type StaffRideRequest,
} from './shuttleCommuteEngine';

describe('shuttleCommuteEngine 단위 테스트', () => {
  const sampleStops: CommuteStop[] = [
    { id: 'stop-3', routeId: 'r-1', stopName: '판교역 1번 출구', sequenceOrder: 3, scheduledMinutesFromStart: 25 },
    { id: 'stop-1', routeId: 'r-1', stopName: '서현역 2번 출구', sequenceOrder: 1, scheduledMinutesFromStart: 0 },
    { id: 'stop-2', routeId: 'r-1', stopName: '야탑역 4번 출구', sequenceOrder: 2, scheduledMinutesFromStart: 12 },
  ];

  const sampleRequests: StaffRideRequest[] = [
    {
      id: 'req-1',
      organizationId: 'org-1',
      staffId: 'staff-1',
      staffName: '홍길동',
      staffPhone: '010-1111-2222',
      departmentName: '플랫폼개발팀',
      routeId: 'r-1',
      stopId: 'stop-1',
      rideType: 'regular',
      status: 'active',
      createdAt: '2026-10-18T00:00:00Z',
    },
    {
      id: 'req-2',
      organizationId: 'org-1',
      staffId: 'staff-2',
      staffName: '이순신',
      staffPhone: '010-3333-4444',
      departmentName: '사업운영팀',
      routeId: 'r-1',
      stopId: 'stop-1',
      rideType: 'single',
      rideDate: '2026-10-20',
      status: 'active',
      createdAt: '2026-10-18T01:00:00Z',
    },
    {
      id: 'req-3',
      organizationId: 'org-1',
      staffId: 'staff-3',
      staffName: '강감찬',
      staffPhone: '010-5555-6666',
      departmentName: '디자인팀',
      routeId: 'r-1',
      stopId: 'stop-2',
      rideType: 'regular',
      status: 'cancelled', // 취소된 신청
      createdAt: '2026-10-18T02:00:00Z',
    },
  ];

  it('1. 정류장 순서(sequenceOrder) 오름차순 정규화', () => {
    const sorted = normalizeCommuteStops(sampleStops);
    assert.strictEqual(sorted[0].id, 'stop-1');
    assert.strictEqual(sorted[1].id, 'stop-2');
    assert.strictEqual(sorted[2].id, 'stop-3');
  });

  it('2. 정류장 순서 변경 (reorderStops) 시 sequenceOrder 자동 재부여', () => {
    // 0번째(stop-1)를 2번째로 이동 -> stop-2, stop-3, stop-1
    const reordered = reorderCommuteStops(sampleStops, 0, 2);
    assert.strictEqual(reordered[0].id, 'stop-2');
    assert.strictEqual(reordered[0].sequenceOrder, 1);
    assert.strictEqual(reordered[1].id, 'stop-3');
    assert.strictEqual(reordered[1].sequenceOrder, 2);
    assert.strictEqual(reordered[2].id, 'stop-1');
    assert.strictEqual(reordered[2].sequenceOrder, 3);
  });

  it('3. 정류장 순서 변경 시 잘못된 인덱스는 원래 정렬 상태 유지', () => {
    const untouched = reorderCommuteStops(sampleStops, -1, 5);
    assert.strictEqual(untouched[0].id, 'stop-1');
    assert.strictEqual(untouched[2].id, 'stop-3');
  });

  it('4. 정류장별 탑승 신청 직원 매핑 및 취소건 제외', () => {
    const mappedStops = mapStaffToCommuteStops(sampleStops, sampleRequests);
    const stop1 = mappedStops.find((s) => s.id === 'stop-1')!;
    const stop2 = mappedStops.find((s) => s.id === 'stop-2')!;
    const stop3 = mappedStops.find((s) => s.id === 'stop-3')!;

    // stop-1에는 active 신청 2건 매핑
    assert.strictEqual(stop1.assignedStaff?.length, 2);
    assert.strictEqual(stop1.assignedStaff[0].staffName, '홍길동');
    assert.strictEqual(stop1.assignedStaff[1].staffName, '이순신');

    // stop-2에는 cancelled 신청만 있으므로 0건
    assert.strictEqual(stop2.assignedStaff?.length, 0);

    // stop-3에는 신청이 없으므로 0건
    assert.strictEqual(stop3.assignedStaff?.length, 0);
  });

  it('5. 탑승자가 0명인 정류장 무정차 통과 판별 (isCommuteStopEmpty)', () => {
    const mappedStops = mapStaffToCommuteStops(sampleStops, sampleRequests);
    const stop1 = mappedStops.find((s) => s.id === 'stop-1')!;
    const stop2 = mappedStops.find((s) => s.id === 'stop-2')!;

    assert.strictEqual(isCommuteStopEmpty(stop1), false);
    assert.strictEqual(isCommuteStopEmpty(stop2), true);
  });

  it('6. 기사 탑승 체크 상태 반영 및 운행 요약 통계 산출', () => {
    const boardingMap = {
      'req-1': 'BOARDED' as const, // 홍길동 탑승
      // req-2는 SCHEDULED
    };
    const mappedStops = mapStaffToCommuteStops(sampleStops, sampleRequests, boardingMap);
    const summary = summarizeCommuteOperation(mappedStops, 1);

    assert.strictEqual(summary.totalAssignedStaff, 2);
    assert.strictEqual(summary.boardedCount, 1);
    assert.strictEqual(summary.scheduledCount, 1);
    assert.strictEqual(summary.emptyStopsCount, 2); // stop-2, stop-3은 0명
    assert.strictEqual(summary.isCompleted, false);
  });

  it('7. 마지막 정류장 도달 시 isCompleted: true', () => {
    const mappedStops = mapStaffToCommuteStops(sampleStops, sampleRequests);
    const summary = summarizeCommuteOperation(mappedStops, 2); // 3개 중 인덱스 2
    assert.strictEqual(summary.isCompleted, true);
  });

  it('8. 출근/퇴근 방향별 노선 필터링', () => {
    const routes: CommuteRoute[] = [
      {
        id: 'r-in',
        organizationId: 'org-1',
        vehicleName: '1호차',
        routeName: '분당 출근 노선',
        driverName: '김기사',
        driverPhone: '010-1234-5678',
        departureTime: '07:30',
        direction: 'commute_in',
        stops: [],
      },
      {
        id: 'r-out',
        organizationId: 'org-1',
        vehicleName: '1호차',
        routeName: '분당 퇴근 노선',
        driverName: '김기사',
        driverPhone: '010-1234-5678',
        departureTime: '18:40',
        direction: 'commute_out',
        stops: [],
      },
    ];

    const inRoutes = filterCommuteRoutes(routes, 'commute_in');
    assert.strictEqual(inRoutes.length, 1);
    assert.strictEqual(inRoutes[0].id, 'r-in');

    const outRoutes = filterCommuteRoutes(routes, 'commute_out');
    assert.strictEqual(outRoutes.length, 1);
    assert.strictEqual(outRoutes[0].id, 'r-out');
  });

  it('9. 임직원 탑승 신청 유효성 검증 (필수 필드 및 1회 탑승 날짜)', () => {
    // 필수 정보 누락
    assert.strictEqual(
      validateCommuteRideRequest({
        staffId: '',
        staffName: '홍길동',
        routeId: 'r-1',
        stopId: 'stop-1',
        rideType: 'regular',
      }).valid,
      false
    );

    // 1회 탑승인데 날짜 누락
    assert.strictEqual(
      validateCommuteRideRequest({
        staffId: 'staff-1',
        staffName: '홍길동',
        routeId: 'r-1',
        stopId: 'stop-1',
        rideType: 'single',
      }).valid,
      false
    );

    // 정상 신청
    assert.strictEqual(
      validateCommuteRideRequest({
        staffId: 'staff-1',
        staffName: '홍길동',
        routeId: 'r-1',
        stopId: 'stop-1',
        rideType: 'single',
        rideDate: '2026-10-21',
      }).valid,
      true
    );
  });
});
