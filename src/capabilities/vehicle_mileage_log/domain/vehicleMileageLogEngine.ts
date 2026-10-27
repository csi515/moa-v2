/**
 * 국세청 업무용 승용차 관련비용 손금불산입 특례 기준 운행기록부 계산 엔진
 */

export type TripPurpose = 'business' | 'commute' | 'general';
export type MileageLogStatus = 'draft' | 'submitted' | 'confirmed';

export interface VehicleMileageLog {
  id: string;
  vehicleId: string;
  vehiclePlateNumber: string;
  driverId: string;
  driverName: string;
  drivingDate: string; // YYYY-MM-DD
  departureTime?: string; // HH:mm
  arrivalTime?: string; // HH:mm
  startOdometerKm: number;
  endOdometerKm: number;
  distanceKm: number;
  tripPurpose: TripPurpose;
  departurePlace: string;
  destination: string;
  fuelCost?: number;
  tollFee?: number;
  notes?: string;
  status: MileageLogStatus;
  createdAt: string;
}

export interface MileageValidationResult {
  valid: boolean;
  error?: string;
}

export interface VehicleFleetSummary {
  vehiclePlateNumber: string;
  totalDistanceKm: number;
  businessDistanceKm: number;
  commuteDistanceKm: number;
  businessRatioPercent: number;
  totalFuelCost: number;
  totalTollFee: number;
  logCount: number;
}

/**
 * 주행거리 계산 및 유효성 검사
 */
export function calculateTripDistance(startKm: number, endKm: number): number {
  if (endKm < startKm) {
    throw new Error('도착 계기판 누적거리(km)는 출발 계기판 누적거리보다 작을 수 없습니다.');
  }
  return endKm - startKm;
}

/**
 * 운행 기록 입력값 검증
 */
export function validateMileageLogEntry(entry: {
  startOdometerKm: number;
  endOdometerKm: number;
  destination: string;
  tripPurpose: TripPurpose;
}): MileageValidationResult {
  if (!entry.destination || entry.destination.trim().length === 0) {
    return { valid: false, error: '목적지를 반드시 입력해야 합니다.' };
  }
  if (entry.startOdometerKm < 0 || entry.endOdometerKm < 0) {
    return { valid: false, error: '계기판 거리는 0 이상이어야 합니다.' };
  }
  if (entry.endOdometerKm < entry.startOdometerKm) {
    return { valid: false, error: '도착 계기판 거리가 출발 계기판 거리보다 작습니다.' };
  }
  const distance = entry.endOdometerKm - entry.startOdometerKm;
  if (distance === 0) {
    return { valid: false, error: '실제 주행거리가 0km입니다.' };
  }
  return { valid: true };
}

/**
 * 차량별 운행 집계 및 국세청 업무사용비율 계산
 * 업무사용비율 = (일반업무용 주행거리 + 출퇴근용 주행거리) / 총 주행거리 * 100
 */
export function summarizeVehicleFleet(logs: VehicleMileageLog[]): Record<string, VehicleFleetSummary> {
  const summary: Record<string, VehicleFleetSummary> = {};

  for (const log of logs) {
    const plate = log.vehiclePlateNumber || '미지정 차량';
    if (!summary[plate]) {
      summary[plate] = {
        vehiclePlateNumber: plate,
        totalDistanceKm: 0,
        businessDistanceKm: 0,
        commuteDistanceKm: 0,
        businessRatioPercent: 100,
        totalFuelCost: 0,
        totalTollFee: 0,
        logCount: 0,
      };
    }

    const cur = summary[plate];
    cur.totalDistanceKm += log.distanceKm;
    if (log.tripPurpose === 'business') {
      cur.businessDistanceKm += log.distanceKm;
    } else if (log.tripPurpose === 'commute') {
      cur.commuteDistanceKm += log.distanceKm;
    }
    cur.totalFuelCost += log.fuelCost || 0;
    cur.totalTollFee += log.tollFee || 0;
    cur.logCount += 1;
  }

  // 비율 계산
  for (const plate of Object.keys(summary)) {
    const cur = summary[plate];
    if (cur.totalDistanceKm > 0) {
      const qualifyingDistance = cur.businessDistanceKm + cur.commuteDistanceKm;
      cur.businessRatioPercent = Math.min(100, Math.round((qualifyingDistance / cur.totalDistanceKm) * 100));
    } else {
      cur.businessRatioPercent = 100;
    }
  }

  return summary;
}
