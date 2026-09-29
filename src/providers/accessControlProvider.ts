import type { AccessControlProvider } from "@refinedev/core";
import { StorageService } from "@/services/storage";
import * as orgService from "@/core/organizations/services/organizationService";
import { createAuthorizationApi } from "@/core/authorization/authorizationApi";
import { isKnownPermission } from "@/core/authorization/registry";
import { isOrgAdminRole } from "@/core/authorization/roleDefaults";
import type { Permission } from "@/core/authorization/types";

/**
 * Maps Refine resource and action pairs to MOA canonical permissions.
 */
function resolveMoaPermission(resource?: string, action?: string): Permission | string | null {
  if (!resource) return null;
  const res = resource.toLowerCase();
  const act = (action || "list").toLowerCase();

  // Explicit permission mapping by resource
  switch (res) {
    case "customers":
    case "students":
      return act === "list" || act === "show" || act === "read"
        ? "customers.read"
        : "customers.write";

    case "tuition_invoices":
    case "sales":
    case "billing":
    case "payments":
      if (act === "delete" || act === "refund") return "sales.refund";
      if (act === "create" || act === "edit") return "sales.create";
      if (act === "finance" || act === "audit") return "finance.read";
      return "sales.read";

    case "schedules":
    case "attendance":
    case "rooms":
      return act === "list" || act === "show" || act === "read"
        ? "rooms.read"
        : "rooms.manage";

    case "staff":
    case "instructors":
    case "members":
      return act === "list" || act === "show" || act === "read"
        ? "staff.read"
        : "staff.manage";

    case "locations":
      return "locations.read";

    case "reports":
    case "analytics":
      return "reports.read";

    case "dashboard":
      return "customers.read";

    default: {
      const candidate = `${res}.${act}`;
      if (isKnownPermission(candidate)) return candidate;
      return null;
    }
  }
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const activeUser = StorageService.getActiveUser();
    const organizationId =
      (params?.organizationId as string | undefined) ||
      orgService.getStoredOrganizationId() ||
      "";
    const role = (params?.role as string | undefined) || activeUser?.role || null;
    const locationId = (params?.locationId as string | undefined) || null;
    const customerId =
      (params?.customerId as string | undefined) ||
      activeUser?.parentCustomerId ||
      null;

    // Director / Owner / Manager bypass (matches RLS is_org_admin)
    if (isOrgAdminRole(role)) {
      return { can: true };
    }

    // Unassigned organization check
    if (!organizationId) {
      // Allow public or generic reads if unauthenticated
      if (resource === "auth" || resource === "public") {
        return { can: true };
      }
      return {
        can: false,
        reason: "소속 사업장을 선택해 주세요.",
      };
    }

    // Determine target permission
    const explicitPermission = params?.permission as string | undefined;
    const targetPermission = explicitPermission || resolveMoaPermission(resource, action);

    if (!targetPermission) {
      // If no permission rule is defined, default to allowing read and restricting mutation
      const isMutation = action === "create" || action === "edit" || action === "delete";
      if (isMutation) {
        return {
          can: false,
          reason: "해당 작업을 수행할 권한이 없습니다.",
        };
      }
      return { can: true };
    }

    const authApi = createAuthorizationApi({
      organizationId,
      role,
      locationId,
      customerId,
      extraGrants: (params?.extraGrants as any) || [],
    });

    const allowed = authApi.can({
      permission: targetPermission,
      scopeType: locationId ? "location" : "organization",
      scopeId: locationId || undefined,
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
