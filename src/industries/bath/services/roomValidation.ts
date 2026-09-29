import {
  BATH_FLOOR_TYPES,
  BATH_ROOM_TYPES,
  type BathFloorType,
  type BathRoomType,
  type BathRoomWriteInput,
} from '../types/room';

export type BathRoomValidationError =
  | 'room_number'
  | 'name'
  | 'room_type'
  | 'floor_type'
  | 'capacity'
  | 'bathtub_count'
  | 'base_price'
  | 'sort_order';

const ROOM_TYPE_SET = new Set<string>(BATH_ROOM_TYPES);
const FLOOR_TYPE_SET = new Set<string>(BATH_FLOOR_TYPES);

export function isBathRoomType(value: string): value is BathRoomType {
  return ROOM_TYPE_SET.has(value);
}

export function isBathFloorType(value: string): value is BathFloorType {
  return FLOOR_TYPE_SET.has(value);
}

export function validateBathRoomInput(
  input: BathRoomWriteInput
): { ok: true } | { ok: false; reason: BathRoomValidationError } {
  if (!input.roomNumber.trim()) return { ok: false, reason: 'room_number' };
  if (!input.name.trim()) return { ok: false, reason: 'name' };
  if (!isBathRoomType(input.roomType)) return { ok: false, reason: 'room_type' };
  if (!isBathFloorType(input.floorType)) return { ok: false, reason: 'floor_type' };
  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    return { ok: false, reason: 'capacity' };
  }
  const bathtubs = input.bathtubCount ?? 0;
  if (!Number.isInteger(bathtubs) || bathtubs < 0) {
    return { ok: false, reason: 'bathtub_count' };
  }
  const price = input.basePrice ?? 0;
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, reason: 'base_price' };
  }
  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder)) {
    return { ok: false, reason: 'sort_order' };
  }
  return { ok: true };
}

export function bathRoomValidationMessage(reason: BathRoomValidationError): string {
  if (reason === 'room_number') return '객실 번호를 입력하세요.';
  if (reason === 'name') return '객실 이름을 입력하세요.';
  if (reason === 'room_type') return '객실 유형이 올바르지 않습니다.';
  if (reason === 'floor_type') return '바닥 유형이 올바르지 않습니다.';
  if (reason === 'capacity') return '수용 인원은 1명 이상이어야 합니다.';
  if (reason === 'bathtub_count') return '욕조 수는 0 이상이어야 합니다.';
  if (reason === 'base_price') return '기본 요금은 0 이상이어야 합니다.';
  return '정렬 값이 올바르지 않습니다.';
}
