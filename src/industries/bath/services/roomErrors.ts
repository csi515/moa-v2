export function mapBathRoomRpcError(error: { message?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Room not found/i.test(raw)) {
    return { code: 'not_found', message: '객실을 찾을 수 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 객실입니다.' };
  }
  if (/duplicate key|unique/i.test(raw) || /Room number already exists/i.test(raw)) {
    return { code: 'duplicate', message: '이미 있는 객실 번호입니다.' };
  }
  if (/Invalid room number/i.test(raw)) {
    return { code: 'room_number', message: '객실 번호를 입력하세요.' };
  }
  if (/Invalid room name/i.test(raw)) {
    return { code: 'name', message: '객실 이름을 입력하세요.' };
  }
  if (/Invalid room type/i.test(raw)) {
    return { code: 'room_type', message: '객실 유형이 올바르지 않습니다.' };
  }
  if (/Invalid floor type/i.test(raw)) {
    return { code: 'floor_type', message: '바닥 유형이 올바르지 않습니다.' };
  }
  if (/Invalid capacity/i.test(raw)) {
    return { code: 'capacity', message: '수용 인원은 1명 이상이어야 합니다.' };
  }
  if (/Invalid bathtub/i.test(raw)) {
    return { code: 'bathtub_count', message: '욕조 수는 0 이상이어야 합니다.' };
  }
  if (/Invalid base price/i.test(raw)) {
    return { code: 'base_price', message: '기본 요금은 0 이상이어야 합니다.' };
  }
  if (/Room has active reservations/i.test(raw)) {
    return { code: 'reserved', message: '예약이 있는 객실은 삭제할 수 없습니다.' };
  }
  return { code: 'unknown', message: raw || '객실 처리에 실패했습니다.' };
}
