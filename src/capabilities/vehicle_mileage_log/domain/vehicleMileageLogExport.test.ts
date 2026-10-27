import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateNtsMileageCsv } from './vehicleMileageLogExport';
import type { VehicleMileageLog } from './vehicleMileageLogEngine';

describe('vehicleMileageLogExport test suite', () => {
  it('국세청 별지 제29호의2 서식에 맞는 CSV 및 BOM을 생성한다', () => {
    const logs: VehicleMileageLog[] = [
      {
        id: 'log-1',
        vehicleId: 'v-1',
        vehiclePlateNumber: '12가 3456',
        driverId: 'u-1',
        driverName: '홍길동',
        drivingDate: '2026-04-20',
        startOdometerKm: 1000,
        endOdometerKm: 1100,
        distanceKm: 100,
        tripPurpose: 'business',
        departurePlace: '본사',
        destination: '화성공장',
        fuelCost: 50000,
        status: 'confirmed',
        createdAt: '2026-04-20T09:00:00Z',
      },
    ];

    const csv = generateNtsMileageCsv(logs, '(주)모아플랜트', 2026);
    assert.ok(csv.startsWith('\uFEFF'), 'UTF-8 BOM 확인');
    assert.match(csv, /별지 제29호의2 서식/);
    assert.match(csv, /5년간 법적 보존/);
    assert.match(csv, /12가 3456/);
    assert.match(csv, /1000,1100,100,0,100,50000/);
  });
});
