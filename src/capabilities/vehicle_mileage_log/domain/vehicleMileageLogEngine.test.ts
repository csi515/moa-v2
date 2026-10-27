import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTripDistance,
  validateMileageLogEntry,
  summarizeVehicleFleet,
  type VehicleMileageLog,
} from './vehicleMileageLogEngine';

describe('vehicleMileageLogEngine test suite', () => {
  it('계기판 누적거리로부터 올바른 주행거리를 계산한다', () => {
    const dist = calculateTripDistance(12500, 12650);
    assert.equal(dist, 150);
  });

  it('도착 계기판이 출발 계기판보다 작으면 에러를 던진다', () => {
    assert.throws(() => {
      calculateTripDistance(12500, 12400);
    }, /도착 계기판 누적거리/);
  });

  it('목적지 누락 및 계기판 역전 검증을 올바르게 수행한다', () => {
    const emptyDest = validateMileageLogEntry({
      startOdometerKm: 1000,
      endOdometerKm: 1050,
      destination: '',
      tripPurpose: 'business',
    });
    assert.equal(emptyDest.valid, false);
    assert.match(emptyDest.error || '', /목적지/);

    const validEntry = validateMileageLogEntry({
      startOdometerKm: 1000,
      endOdometerKm: 1050,
      destination: '본사 회의실',
      tripPurpose: 'business',
    });
    assert.equal(validEntry.valid, true);
  });

  it('차량별 운행 합계 및 국세청 손금 인정 업무사용비율을 계산한다', () => {
    const logs: VehicleMileageLog[] = [
      {
        id: 'log-1',
        vehicleId: 'v-1',
        vehiclePlateNumber: '11호 1111',
        driverId: 'u-1',
        driverName: '홍길동',
        drivingDate: '2026-04-01',
        startOdometerKm: 10000,
        endOdometerKm: 10100,
        distanceKm: 100,
        tripPurpose: 'business',
        departurePlace: '본사',
        destination: '화성 공장',
        fuelCost: 30000,
        tollFee: 4500,
        status: 'confirmed',
        createdAt: '2026-04-01T09:00:00Z',
      },
      {
        id: 'log-2',
        vehicleId: 'v-1',
        vehiclePlateNumber: '11호 1111',
        driverId: 'u-2',
        driverName: '김철수',
        drivingDate: '2026-04-02',
        startOdometerKm: 10100,
        endOdometerKm: 10150,
        distanceKm: 50,
        tripPurpose: 'commute',
        departurePlace: '자택',
        destination: '연구소',
        status: 'confirmed',
        createdAt: '2026-04-02T08:00:00Z',
      },
      {
        id: 'log-3',
        vehicleId: 'v-1',
        vehiclePlateNumber: '11호 1111',
        driverId: 'u-3',
        driverName: '박영희',
        drivingDate: '2026-04-03',
        startOdometerKm: 10150,
        endOdometerKm: 10200,
        distanceKm: 50,
        tripPurpose: 'general', // 사적 이용
        departurePlace: '연구소',
        destination: '개인용무',
        status: 'confirmed',
        createdAt: '2026-04-03T18:00:00Z',
      },
    ];

    const fleet = summarizeVehicleFleet(logs);
    const v1 = fleet['11호 1111'];
    assert.ok(v1);
    assert.equal(v1.totalDistanceKm, 200);
    assert.equal(v1.businessDistanceKm, 100);
    assert.equal(v1.commuteDistanceKm, 50);
    // (100 + 50) / 200 = 75%
    assert.equal(v1.businessRatioPercent, 75);
    assert.equal(v1.totalFuelCost, 30000);
    assert.equal(v1.totalTollFee, 4500);
    assert.equal(v1.logCount, 3);
  });
});
