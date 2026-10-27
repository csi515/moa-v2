/**
 * 시간제 공간 타이머 & 초과요금 자동 과금 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 스터디카페(study_cafe), 공간·파티룸 대여(space_rental), 실내 골프 타석(indoor_golf)
 *
 * 주요 기능:
 *  1. 좌석/룸/타석별 실시간 잔여시간 카운트다운 타이머 계산
 *  2. 대여 시간 종료 시 10분 단위 초과 요금 자동 누적 및 후불 결산
 *  3. 입실/퇴실/청소대기 상태머신 (AVAILABLE -> OCCUPIED -> OVERDUE -> CLEANING -> AVAILABLE)
 */

export type SeatSpaceType = 'study_desk' | 'meeting_room' | 'golf_bay' | 'party_room';
export type SeatTimerStatus = 'AVAILABLE' | 'OCCUPIED' | 'OVERDUE' | 'CLEANING';

export interface SeatTimerSlot {
  id: string;
  slotNumber: string; // e.g. "좌석 12번", "스터디룸 A", "타석 5번"
  spaceType: SeatSpaceType;
  status: SeatTimerStatus;
  assignedUser?: {
    name: string;
    phone: string;
  };
  startTime?: string; // ISO String
  allocatedMinutes: number; // 부여된 기본 이용시간 (분)
  baseRatePerHour: number; // 시간당 기본 요금
  overdueRatePer10Min: number; // 초과 10분당 과금액
}

export interface SeatBillingResult {
  slotId: string;
  slotNumber: string;
  elapsedMinutes: number;
  remainingMinutes: number;
  overdueMinutes: number;
  baseFee: number;
  overdueFee: number;
  totalFee: number;
  status: SeatTimerStatus;
}

export interface SeatTimerBoardSummary {
  totalSlots: number;
  occupiedSlots: number;
  overdueSlots: number;
  availableSlots: number;
  cleaningSlots: number;
  utilizationRatePercent: number;
}

/**
 * 1. 단일 좌석/룸 실시간 경과 시간 및 초과 요금 자동 산출 (순수 함수)
 */
export function calculateSeatTimerBilling(
  slot: SeatTimerSlot,
  currentTime?: string
): SeatBillingResult {
  if (slot.status === 'AVAILABLE' || slot.status === 'CLEANING' || !slot.startTime) {
    return {
      slotId: slot.id,
      slotNumber: slot.slotNumber,
      elapsedMinutes: 0,
      remainingMinutes: slot.allocatedMinutes,
      overdueMinutes: 0,
      baseFee: 0,
      overdueFee: 0,
      totalFee: 0,
      status: slot.status,
    };
  }

  const now = currentTime ? new Date(currentTime) : new Date();
  const start = new Date(slot.startTime);
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const elapsedMinutes = Math.floor(diffMs / (1000 * 60));

  const remainingMinutes = Math.max(0, slot.allocatedMinutes - elapsedMinutes);
  const overdueMinutes = Math.max(0, elapsedMinutes - slot.allocatedMinutes);

  const baseFee = Math.round((slot.allocatedMinutes / 60) * slot.baseRatePerHour);
  const overdue10MinBlocks = Math.ceil(overdueMinutes / 10);
  const overdueFee = overdue10MinBlocks * slot.overdueRatePer10Min;
  const totalFee = baseFee + overdueFee;

  const status: SeatTimerStatus = overdueMinutes > 0 ? 'OVERDUE' : 'OCCUPIED';

  return {
    slotId: slot.id,
    slotNumber: slot.slotNumber,
    elapsedMinutes,
    remainingMinutes,
    overdueMinutes,
    baseFee,
    overdueFee,
    totalFee,
    status,
  };
}

/**
 * 2. 공간 점유 및 초과 현황 보드 집계 (순수 함수)
 */
export function summarizeSeatTimerBoard(
  slots: readonly SeatTimerSlot[],
  currentTime?: string
): SeatTimerBoardSummary {
  let occupiedSlots = 0;
  let overdueSlots = 0;
  let availableSlots = 0;
  let cleaningSlots = 0;

  for (const s of slots) {
    if (s.status === 'CLEANING') {
      cleaningSlots++;
      continue;
    }
    if (s.status === 'AVAILABLE') {
      availableSlots++;
      continue;
    }
    const billing = calculateSeatTimerBilling(s, currentTime);
    if (billing.status === 'OVERDUE') {
      overdueSlots++;
    } else {
      occupiedSlots++;
    }
  }

  const activeCount = occupiedSlots + overdueSlots;
  const utilizationRatePercent =
    slots.length > 0 ? Math.round((activeCount / slots.length) * 1000) / 10 : 0;

  return {
    totalSlots: slots.length,
    occupiedSlots,
    overdueSlots,
    availableSlots,
    cleaningSlots,
    utilizationRatePercent,
  };
}
