import type { AccessControlProvider } from "@refinedev/core";
import { StorageService } from "@/services/storage";
import * as orgService from "@/core/organizations/services/organizationService";
import { getStoredLocationId, locationService } from "@/core/locations/locationService";
import { createAuthorizationApi } from "@/core/authorization/authorizationApi";
import { isKnownPermission, isKnownScopeType } from "@/core/authorization/registry";
import type { AuthorizationGrant, AuthScopeType, Permission } from "@/core/authorization/types";
import type { User } from "@/types";
import { evaluateCustomPermission } from "@/domain/permissions";

/**
 * AccessControl Context Resolver.
 * Resolves the authenticated user, active organization, and grants from the single source of truth.
 * Custom resolvers can be injected for testing and isolation.
 */
export interface AccessControlContextResolver {
  getActiveUser: () => User | null;
  getOrganizationId: () => string | null;
  getLocationId: (organizationId?: string | null) => string | null;
  listAccessGrants?: (organizationId: string) => Promise<AuthorizationGrant[]>;
}

type GrantsCacheEntry = {
  timestamp: number;
  userId: string;
  grants: AuthorizationGrant[];
};
const CACHE_TTL_MS = 10_000;

/**
 * Canonical mapping between Refine (resource, action) pairs and MOA canonical permissions.
 * Unmapped pairs return null (Fail-Closed).
 */
export function resolveMoaPermission(resource?: string, action?: string): Permission | null {
  if (!resource) return null;
  const res = resource.trim().toLowerCase();
  const act = (action || "list").trim().toLowerCase();

  // 1. Direct canonical permission check (e.g., resource="customers", action="read" -> "customers.read")
  const directCandidate = `${res}.${act}`;
  if (isKnownPermission(directCandidate)) {
    return directCandidate;
  }

  // 2. Explicit mappings by resource
  switch (res) {
    case "customers":
    case "students":
    case "users":
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "customers.read";
      }
      if (
        act === "create" ||
        act === "edit" ||
        act === "delete" ||
        act === "write" ||
        act === "import"
      ) {
        return "customers.write";
      }
      return null;

    case "schedules":
    case "attendance":
      // 수업 일정 및 출석 관리는 원생/수업 정보(customers)와 연동 (rooms 임의 매핑 제거)
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "customers.read";
      }
      if (act === "create" || act === "edit" || act === "delete" || act === "write") {
        return "customers.write";
      }
      return null;

    case "tuition_invoices":
    case "sales":
    case "billing":
    case "payments":
      if (act === "delete" || act === "refund") {
        return "sales.refund";
      }
      if (act === "create" || act === "edit" || act === "write") {
        return "sales.create";
      }
      if (act === "finance" || act === "audit") {
        return "finance.read";
      }
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "sales.read";
      }
      return null;

    case "finance":
      if (act === "list" || act === "show" || act === "read" || act === "audit") {
        return "finance.read";
      }
      return null;

    case "staff":
    case "instructors":
    case "members":
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "staff.read";
      }
      if (
        act === "create" ||
        act === "edit" ||
        act === "delete" ||
        act === "write" ||
        act === "manage"
      ) {
        return "staff.manage";
      }
      return null;

    case "rooms":
    case "practice_rooms":
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "rooms.read";
      }
      if (
        act === "create" ||
        act === "edit" ||
        act === "delete" ||
        act === "write" ||
        act === "manage"
      ) {
        return "rooms.manage";
      }
      return null;

    case "locations":
      if (act === "list" || act === "show" || act === "read") {
        return "locations.read";
      }
      return null;

    case "reports":
    case "analytics":
      if (act === "list" || act === "show" || act === "read" || act === "export") {
        return "reports.read";
      }
      return null;

    case "dashboard":
      if (act === "list" || act === "show" || act === "read") {
        return "customers.read";
      }
      return null;

    default:
      return null;
  }
}

let activeContextResolver: Partial<AccessControlContextResolver> | null = null;

/**
 * OrganizationProvider 등 활성 컨텍스트 소스로부터 권한 평가 authority를 동적으로 바인딩한다.
 */
export function bindAccessControlContextResolver(
  resolver: Partial<AccessControlContextResolver> | null
): void {
  activeContextResolver = resolver;
}

/**
 * Creates an AccessControlProvider bound to a context resolver.
 * Ensures caller params cannot escalate permissions or bypass authentication.
 */
export function createAccessControlProvider(
  customResolver?: Partial<AccessControlContextResolver>
): AccessControlProvider {
  const resolver: AccessControlContextResolver = {
    getActiveUser: () => {
      if (activeContextResolver?.getActiveUser) return activeContextResolver.getActiveUser();
      if (customResolver?.getActiveUser) return customResolver.getActiveUser();
      try {
        return StorageService.getActiveUser();
      } catch {
        return null;
      }
    },
    getOrganizationId: () => {
      if (activeContextResolver?.getOrganizationId) return activeContextResolver.getOrganizationId();
      if (customResolver?.getOrganizationId) return customResolver.getOrganizationId();
      try {
        return orgService.getStoredOrganizationId();
      } catch {
        return null;
      }
    },
    getLocationId: (orgId?: string | null) => {
      if (activeContextResolver?.getLocationId) {
        return activeContextResolver.getLocationId(orgId);
      }
      if (customResolver?.getLocationId) {
        return customResolver.getLocationId(orgId);
      }
      try {
        return getStoredLocationId(orgId);
      } catch {
        return null;
      }
    },
    listAccessGrants: (orgId: string) =>
      activeContextResolver?.listAccessGrants?.(orgId) ??
      customResolver?.listAccessGrants?.(orgId) ??
      locationService.listAccessGrants(orgId),
  };

  const grantsCache = new Map<string, GrantsCacheEntry>();

  async function getCachedGrants(
    organizationId: string,
    userId: string,
    fetcher?: (orgId: string) => Promise<AuthorizationGrant[]>
  ): Promise<AuthorizationGrant[]> {
    if (!organizationId || !userId || !fetcher) return [];

    const cacheKey = `${organizationId}:${userId}`;
    const now = Date.now();
    const cached = grantsCache.get(cacheKey);

    if (cached && cached.userId === userId && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.grants;
    }

    try {
      const grants = await fetcher(organizationId);
      grantsCache.set(cacheKey, { timestamp: now, userId, grants });
      return grants;
    } catch {
      return [];
    }
  }

  return {
    can: async ({ resource, action, params }) => {
      // 1. Public or Auth resources: Always allow without authentication
      if (resource === "auth" || resource === "public") {
        return { can: true };
      }

      // 2. Resolve Active Context from Single Source of Truth
      const activeUser = resolver.getActiveUser();
      if (!activeUser || !activeUser.id) {
        return { can: false, reason: "로그인이 필요합니다." };
      }

      const organizationId = resolver.getOrganizationId() || "";
      if (!organizationId) {
        return { can: false, reason: "소속 사업장을 선택해 주세요." };
      }

      // 절대 params.role이나 params.organizationId를 사용하지 않음 (권한 상승 방지)
      const role = activeUser.role || null;
      const activeLocationId = resolver.getLocationId(organizationId) || null;
      const parentCustomerId = activeUser.parentCustomerId || null;

      // 2.5 Evaluate Tenant Custom Role Permissions with Wildcards (Hybrid RBAC)
      const userPermissions =
        (activeUser as any)?.permissions ||
        (activeUser as any)?.customRole?.permissions ||
        [];
      const requiredActionStr = `${resource}:${action || "view"}`;
      if (Array.isArray(userPermissions) && userPermissions.length > 0) {
        if (evaluateCustomPermission(userPermissions, requiredActionStr, role)) {
          return { can: true };
        }
      }

      // 3. Resolve Target Canonical Permission (Fail-Closed)
      //
      // 보안 원칙: resource/action → registry 매핑만 허용한다.
      // params.permission은 permission authority로 사용하지 않는다.
      // 호출자가 params.permission으로 임의 canonical permission을 지정하는 경로를 닫는다.
      //
      // params.permission 처리 규칙:
      //   - 미등록 permission → deny (유효하지 않은 권한 식별자)
      //   - 등록된 permission이더라도 → deny (resource/action 우회 방지)
      //
      // 올바른 흐름: resource + action → resolveMoaPermission() → canonical permission
      if (params?.permission != null) {
        const suppliedPerm = typeof params.permission === "string" ? params.permission : "";
        if (!isKnownPermission(suppliedPerm)) {
          return { can: false, reason: "유효하지 않은 권한 식별자입니다." };
        }
        // 등록된 permission이더라도 호출자가 직접 지정하는 것은 허용하지 않는다.
        return {
          can: false,
          reason: "params.permission을 통한 권한 지정은 허용되지 않습니다.",
        };
      }

      // resource + action 기반 매핑만 신뢰한다.
      const targetPermission: Permission | null = resolveMoaPermission(resource, action);

      if (!targetPermission) {
        // Fail-Closed: 알려지지 않은 리소스나 액션은 기본 거부
        return {
          can: false,
          reason: "해당 리소스 또는 작업에 대한 권한이 정의되지 않았습니다.",
        };
      }

      // 4. Resolve Scope from params (권한 상승이 아닌 개별 데이터 스코프 대상 식별용으로만 사용)
      let scopeType: AuthScopeType = "organization";
      let scopeId: string | null = null;

      if (params?.scopeType && isKnownScopeType(params.scopeType)) {
        scopeType = params.scopeType;
        scopeId = (params.scopeId as string) || null;
      } else if (params?.locationId) {
        scopeType = "location";
        scopeId = String(params.locationId);
      } else if (params?.customerId) {
        scopeType = "customer";
        scopeId = String(params.customerId);
      } else if (params?.resourceId) {
        scopeType = "resource";
        scopeId = String(params.resourceId);
      } else if (params?.id != null) {
        const res = (resource || "").toLowerCase();
        if (res === "locations") {
          scopeType = "location";
          scopeId = String(params.id);
        } else if (res === "customers" || res === "students") {
          scopeType = "customer";
          scopeId = String(params.id);
        } else if (res === "rooms" || res === "practice_rooms") {
          scopeType = "resource";
          scopeId = String(params.id);
        }
      }

      if (scopeType === "organization" && targetPermission === "locations.read" && activeLocationId) {
        scopeType = "location";
        scopeId = activeLocationId;
      }

      // 5. Fetch Extra Grants (세션 유저 기준)
      const extraGrants = await getCachedGrants(
        organizationId,
        activeUser.id,
        resolver.listAccessGrants
      );

      // 6. Delegate to MOA Canonical Authorization API
      const authApi = createAuthorizationApi({
        organizationId,
        role,
        locationId: scopeType === "location" ? (scopeId || activeLocationId) : activeLocationId,
        customerId: parentCustomerId,
        extraGrants,
      });

      const allowed = authApi.can({
        permission: targetPermission,
        scopeType,
        scopeId: scopeId || undefined,
      });

      if (!allowed) {
        return {
          can: false,
          reason: "해당 리소스에 접근할 권한이 없습니다.",
        };
      }

      return { can: true };
    },
  };
}

export const accessControlProvider: AccessControlProvider = createAccessControlProvider();
