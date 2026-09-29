import {
  parseGuardianLinkFromUrl,
  storePendingGuardianLink,
} from '@/core/parent/services/guardianLinkService';
import { setParentPortalModeActive } from '@/core/parent/services/appModeService';
import { parseDeepLinksFromUrl } from './deepLinkParser';
import {
  notifyStaffLinkPending,
  parseStaffLinkFromUrl,
  storePendingStaffLink,
} from './pendingStaffLink';

/** 로그인 세션 중 보호자 딥링크 수신 시 OrganizationProvider가 포털로 전환 */
export const GUARDIAN_LINK_PENDING_EVENT = 'moa:guardian-link-pending';

function notifyGuardianLinkPending(): void {
  setParentPortalModeActive(true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GUARDIAN_LINK_PENDING_EVENT));
  }
}

/** 네이티브/유니버설 링크 URL 문자열 → pending session 저장 */
export function applyDeepLinkFromString(url: string): void {
  const { staffLink, guardianLink } = parseDeepLinksFromUrl(url);
  if (staffLink) {
    storePendingStaffLink(staffLink);
    notifyStaffLinkPending();
  }
  if (guardianLink) {
    storePendingGuardianLink(guardianLink);
    notifyGuardianLinkPending();
  }
}

/** 웹/PWA: 현재 URL 쿼리(staff_link, link)를 sessionStorage에 저장하고 URL에서 제거 */
export function bootstrapWebDeepLinks(): void {
  const staff = parseStaffLinkFromUrl();
  if (staff) {
    storePendingStaffLink(staff);
    notifyStaffLinkPending();
  }

  const guardian = parseGuardianLinkFromUrl();
  if (guardian) {
    storePendingGuardianLink(guardian);
    notifyGuardianLinkPending();
  }
}
