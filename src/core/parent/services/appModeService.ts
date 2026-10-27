const PARENT_PORTAL_MODE_KEY = 'moa_parent_portal_active';
const CUSTOMER_PORTAL_MODE_KEY = 'moa_customer_portal_active';

export function isParentPortalModeActive(): boolean {
  return sessionStorage.getItem(PARENT_PORTAL_MODE_KEY) === '1';
}

export function setParentPortalModeActive(active: boolean): void {
  if (active) {
    sessionStorage.setItem(PARENT_PORTAL_MODE_KEY, '1');
    sessionStorage.removeItem(CUSTOMER_PORTAL_MODE_KEY);
  } else {
    sessionStorage.removeItem(PARENT_PORTAL_MODE_KEY);
  }
}

export function isCustomerPortalModeActive(): boolean {
  return sessionStorage.getItem(CUSTOMER_PORTAL_MODE_KEY) === '1';
}

export function setCustomerPortalModeActive(active: boolean): void {
  if (active) {
    sessionStorage.setItem(CUSTOMER_PORTAL_MODE_KEY, '1');
    sessionStorage.removeItem(PARENT_PORTAL_MODE_KEY);
  } else {
    sessionStorage.removeItem(CUSTOMER_PORTAL_MODE_KEY);
  }
}
