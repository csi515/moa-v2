import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import type { DataProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase/client";
import * as orgService from "@/core/organizations/services/organizationService";
import { StorageService } from "@/services/storage";

/**
 * Thrown when a DataProvider operation is executed without valid Supabase configuration.
 * Distinguishes missing environment credentials from network/DB query errors.
 */
export class SupabaseClientNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase client is not configured. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are properly set."
    );
    this.name = "SupabaseClientNotConfiguredError";
  }
}

/**
 * Creates a defensive proxy DataProvider that preserves build-time & type-check safety
 * while failing explicitly at runtime if environment variables are not supplied.
 */
function createUnconfiguredDataProvider(): DataProvider {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Allow inspections, serialization, and symbol access without throwing
      if (typeof prop === "symbol" || prop === "then" || prop === "inspect" || prop === "toString") {
        return undefined;
      }
      return async () => {
        throw new SupabaseClientNotConfiguredError();
      };
    },
  };

  return new Proxy({}, handler) as DataProvider;
}

function resolveActiveOrgId(): string | null {
  return orgService.getStoredOrganizationId() || StorageService.getOrganizationId() || null;
}

export function createMoaDataProvider(): DataProvider {
  if (!supabase) {
    return createUnconfiguredDataProvider();
  }

  const baseProvider = refineSupabaseDataProvider(supabase);

  return {
    ...baseProvider,

    getList: async (params) => {
      const { resource, filters = [] } = params;
      const activeOrgId = resolveActiveOrgId();

      // customers 리소스에 대한 테넌트 필터 보장
      if (resource === "customers" && activeOrgId) {
        const hasOrgFilter = filters.some(
          (f) => "field" in f && f.field === "organization_id"
        );
        if (!hasOrgFilter) {
          params = {
            ...params,
            filters: [
              ...filters,
              {
                field: "organization_id",
                operator: "eq",
                value: activeOrgId,
              },
            ],
          };
        }
      }

      return baseProvider.getList(params);
    },

    create: async (params) => {
      let { resource, variables } = params;
      const activeOrgId = resolveActiveOrgId();

      // customers 신규 등록 시 현재 활성 사업장 ID 자동 주입
      if (resource === "customers") {
        const record = variables as Record<string, any>;
        if (!record.organization_id && activeOrgId) {
          variables = {
            ...record,
            organization_id: activeOrgId,
          } as typeof variables;
        }
      }

      return baseProvider.create({
        ...params,
        variables,
      });
    },

    update: async (params) => {
      const { resource, variables } = params;
      let safeVariables = { ...(variables as Record<string, any>) };

      // organization_id 변조 방지 (호출자가 조직을 임의로 이동시키는 것 방지)
      if (resource === "customers" && "organization_id" in safeVariables) {
        delete safeVariables.organization_id;
      }

      return baseProvider.update({
        ...params,
        variables: safeVariables as typeof variables,
      });
    },
  };
}

export const dataProvider: DataProvider = createMoaDataProvider();

