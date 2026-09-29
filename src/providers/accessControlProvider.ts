import type { AccessControlProvider } from "@refinedev/core";
import { isOrgAdmin, isStaffRole, isParentRole } from "@/core/auth/permissionsRole";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const role = (params?.role as string) || "director";

    if (isOrgAdmin(role)) {
      return { can: true };
    }

    if (isStaffRole(role)) {
      if (resource === "tuition_invoices" && action === "delete") {
        return {
          can: false,
          reason: "강사 권한으로는 수강료 청구 내역을 삭제할 수 없습니다.",
        };
      }
      return { can: true };
    }

    if (isParentRole(role)) {
      if (action === "create" || action === "edit" || action === "delete") {
        return {
          can: false,
          reason: "학부모 권한으로는 해당 작업을 수행할 수 없습니다.",
        };
      }
      return { can: true };
    }

    return { can: true };
  },
};
