export {
  isNativeApp,
  isWebApp,
  isIOSApp,
  isAndroidApp,
  getCapacitorPlatform,
} from './capacitorPlatform';
export {
  parseDeepLinksFromUrl,
  parseDeepLinksFromHref,
  normalizeGuardianLinkCode,
  isValidGuardianLinkCode,
  parseGuardianLinkCode,
  formatGuardianLinkCode,
  parseStaffLinkCode,
} from './deepLinkParser';
export { getPublicAppBaseUrl, resolveAppBaseUrl } from './appBaseUrl';
export {
  applyDeepLinkFromString,
  bootstrapWebDeepLinks,
  GUARDIAN_LINK_PENDING_EVENT,
} from './bootstrapDeepLinks';
export { MobileBootstrap } from './MobileBootstrap';
export {
  MOBILE_FOREGROUND_EVENT,
  notifyMobileForeground,
  shouldRefreshSession,
} from './mobileLifecycle';
export {
  storePendingStaffLink,
  consumePendingStaffLink,
  peekPendingStaffLink,
  clearPendingStaffLink,
  STAFF_LINK_PENDING_EVENT,
  parseStaffLinkFromUrl,
} from './pendingStaffLink';
export { shareLink, type ShareLinkResult } from './shareLink';
