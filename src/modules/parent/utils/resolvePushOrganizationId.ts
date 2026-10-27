import {
  ACTIVE_ENROLLMENT_STATUSES,
  type ParentPortalTree,
} from '@/core/parent/types/globalParent';

/** 학부모 포털 푸시 — staff org 대신 자녀 enrollment org 사용 */
export function resolvePushOrganizationId(
  portalTree: ParentPortalTree | null | undefined
): string | undefined {
  const enrollments = portalTree?.children.flatMap((s) => s.enrollments) ?? [];
  const active = enrollments.find((e) =>
    ACTIVE_ENROLLMENT_STATUSES.includes(e.status)
  );
  return active?.organizationId ?? enrollments[0]?.organizationId;
}
