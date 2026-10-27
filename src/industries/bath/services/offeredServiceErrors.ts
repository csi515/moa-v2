export function mapBathServiceRpcError(error: { message?: string }): {
  code: string;
  message: string;
} {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Service not found/i.test(raw)) {
    return { code: 'not_found', message: '서비스를 찾을 수 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 서비스입니다.' };
  }
  if (/duplicate key|unique/i.test(raw) || /Service name already exists/i.test(raw)) {
    return { code: 'duplicate', message: '이미 있는 서비스 이름입니다.' };
  }
  if (/Invalid service name/i.test(raw)) {
    return { code: 'name', message: '서비스 이름을 입력하세요.' };
  }
  if (/Invalid duration/i.test(raw)) {
    return { code: 'duration', message: '기본 시간은 5분 이상이어야 합니다.' };
  }
  if (/Invalid base price/i.test(raw)) {
    return { code: 'base_price', message: '기본 요금은 0 이상이어야 합니다.' };
  }
  if (/Product not found/i.test(raw)) {
    return { code: 'product', message: '연결할 상품을 찾을 수 없습니다.' };
  }
  if (/Resource not found/i.test(raw)) {
    return { code: 'resource', message: '연결할 자원을 찾을 수 없습니다.' };
  }
  if (/Staff not found/i.test(raw)) {
    return { code: 'staff', message: '연결할 직원을 찾을 수 없습니다.' };
  }
  return { code: 'unknown', message: raw || '서비스 처리에 실패했습니다.' };
}
