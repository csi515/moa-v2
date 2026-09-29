/** Role + Permission + Scope 권한 기반. 기존 member_role / RLS helper를 대체하지 않는다. */

export const AUTH_SCOPE_TYPES = ['organization', 'location', 'resource', 'customer'] as const;

export type AuthScopeType = (typeof AUTH_SCOPE_TYPES)[number];

/** 권한 판정 범위. RequestContext.scope가 이 타입을 재사용한다. */
export type AuthScope = {
  type: AuthScopeType;
  organizationId: string;
  locationId?: string | null;
  resourceId?: string | null;
  customerId?: string | null;
};

export type PermissionDefinition = {
  key: Permission;
  resource: string;
  action: string;
  description: string;
};

export type Permission =
  | 'customers.read'
  | 'customers.write'
  | 'sales.read'
  | 'sales.create'
  | 'sales.refund'
  | 'locations.read'
  | 'rooms.read'
  | 'rooms.manage'
  | 'staff.read'
  | 'staff.manage'
  | 'reports.read'
  | 'finance.read';

/** core.authorization_grants 행. organization grant는 하위 scope를 포함한다. */
export type AuthorizationGrant = {
  organizationId: string;
  userId?: string | null;
  permission: Permission | string;
  scopeType: AuthScopeType;
  scopeId?: string | null;
  active: boolean;
};

export type EvaluatePermissionInput = {
  role: string | null | undefined;
  permission: string;
  scope: AuthScope;
  /**
   * 해당 scope_type 배정 목록.
   * null/빈 배열은 배정 없음 → 전 범위 (core.has_permission 과 동일).
   */
  assignedLocationIds?: readonly string[] | null;
  assignedCustomerIds?: readonly string[] | null;
  assignedResourceIds?: readonly string[] | null;
  extraGrants?: readonly AuthorizationGrant[] | null;
};
