export function mapLocationRpcError(error: { message?: string }): { code: string; message: string } {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 지점입니다.' };
  }
  if (/Location not found/i.test(raw)) {
    return { code: 'not_found', message: '지점을 찾을 수 없습니다.' };
  }
  if (/Location code already exists|duplicate key|uq_locations_org_code/i.test(raw)) {
    return { code: 'code', message: '같은 사업장에 이미 있는 지점 코드입니다.' };
  }
  if (/Location slug already exists|uq_locations_org_slug/i.test(raw)) {
    return { code: 'slug', message: '같은 사업장에 이미 있는 지점 주소입니다.' };
  }
  if (/Invalid location/i.test(raw)) {
    return { code: 'invalid', message: '지점 정보를 확인해 주세요.' };
  }
  return { code: 'unknown', message: raw || '지점 처리에 실패했습니다.' };
}
