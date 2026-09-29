/**
 * 오늘 수업 저장 시 teacherId 결정.
 * staffId(로그인 강사) → 반 담당 강사 → 빈 값. 다른 강사 임의 선택 금지.
 */
export function resolveTodayLessonSaveTeacherId(params: {
  staffId?: string | null;
  classTeacherId?: string | null;
}): string {
  if (params.staffId) return params.staffId;
  if (params.classTeacherId) return params.classTeacherId;
  return '';
}
