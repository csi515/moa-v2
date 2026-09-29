export function mapOpsRpcError(error: { message?: string }): { code: string; message: string } {
  const raw = error.message || '';
  if (/Permission denied|Not authenticated/i.test(raw)) {
    return { code: 'permission', message: '권한이 없습니다.' };
  }
  if (/Organization mismatch/i.test(raw)) {
    return { code: 'org_mismatch', message: '다른 사업장의 작업입니다.' };
  }
  if (/Staff not found/i.test(raw)) {
    return { code: 'staff', message: '해당 사업장 직원이 아닙니다.' };
  }
  if (/Template not found/i.test(raw)) {
    return { code: 'template', message: '체크리스트를 찾을 수 없습니다.' };
  }
  if (/Task not found/i.test(raw)) {
    return { code: 'task', message: '작업을 찾을 수 없습니다.' };
  }
  if (/Issue not found/i.test(raw)) {
    return { code: 'issue', message: '신고 건을 찾을 수 없습니다.' };
  }
  if (/Invalid ops target|Invalid checklist/i.test(raw)) {
    return { code: 'target', message: '대상 또는 체크리스트를 확인해 주세요.' };
  }
  if (/Required checklist items incomplete/i.test(raw)) {
    return { code: 'checks', message: '필수 점검 항목을 먼저 완료해 주세요.' };
  }
  if (/Invalid task transition|not assignable|not completable/i.test(raw)) {
    return { code: 'transition', message: '이 상태에서는 처리할 수 없습니다.' };
  }
  if (/Invalid issue transition|Resolution is required/i.test(raw)) {
    return { code: 'issue_transition', message: '처리 내용과 상태를 확인해 주세요.' };
  }
  return { code: 'unknown', message: raw || '운영 작업 처리에 실패했습니다.' };
}
