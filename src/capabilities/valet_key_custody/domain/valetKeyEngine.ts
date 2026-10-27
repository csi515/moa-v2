/**
 * 차량 키 및 발렛 입출차 보관 도메인 엔진 (Pure Functions)
 */

export type ValetCustodyStatus = 'PARKED' | 'DISPATCH_REQUESTED' | 'DELIVERED';

export interface ValetTicketRecord {
  id: string;
  tenant_id: string;
  ticket_number: string;
  slot_number: number;
  vehicle_number: string;
  vehicle_model?: string;
  scratch_notes?: string;
  valet_fee: number;
  is_fee_paid: boolean;
  status: ValetCustodyStatus;
  parked_at: string;
  delivered_at?: string;
}

export function validateVehicleNumber(num: string): { isValid: boolean; error?: string } {
  if (!num || num.trim().length === 0) {
    return { isValid: false, error: '차량 번호를 입력해 주세요.' };
  }
  const cleaned = num.replace(/\s+/g, '');
  if (cleaned.length < 4) {
    return { isValid: false, error: '올바른 차량 번호를 입력해 주세요 (최소 4자리).' };
  }
  return { isValid: true };
}

export function validateSlotAvailability(
  slotNumber: number,
  occupiedSlots: number[],
  maxSlots: number
): { isAvailable: boolean; error?: string } {
  if (slotNumber < 1 || slotNumber > maxSlots) {
    return { isAvailable: false, error: `슬롯 번호는 1부터 ${maxSlots}까지 지정할 수 있습니다.` };
  }
  if (occupiedSlots.includes(slotNumber)) {
    return { isAvailable: false, error: `슬롯 ${slotNumber}번은 이미 사용 중입니다.` };
  }
  return { isAvailable: true };
}

export function transitionValetStatus(
  currentStatus: ValetCustodyStatus,
  action: 'REQUEST_DISPATCH' | 'DELIVER_KEY'
): { nextStatus: ValetCustodyStatus; isAllowed: boolean; error?: string } {
  if (action === 'REQUEST_DISPATCH') {
    if (currentStatus === 'PARKED') {
      return { nextStatus: 'DISPATCH_REQUESTED', isAllowed: true };
    }
    return { nextStatus: currentStatus, isAllowed: false, error: '입차 보관 중인 차량만 출차 요청 가능합니다.' };
  }
  if (action === 'DELIVER_KEY') {
    if (currentStatus === 'DISPATCH_REQUESTED' || currentStatus === 'PARKED') {
      return { nextStatus: 'DELIVERED', isAllowed: true };
    }
    return { nextStatus: currentStatus, isAllowed: false, error: '이미 인도 완료된 차량입니다.' };
  }
  return { nextStatus: currentStatus, isAllowed: false };
}
