import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import type { CrudFilter, DataProvider } from "@refinedev/core";
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
 * Thrown when a tenant-scoped DataProvider call has no resolved active organization.
 * Fail closed: do not query or write without an organization filter.
 */
export class ActiveOrganizationRequiredError extends Error {
  constructor() {
    super("Active organization is required for tenant-scoped data access.");
    this.name = "ActiveOrganizationRequiredError";
  }
}

/**
 * Refine resources this provider actually serves that have organization_id.
 * - customers: useTable / useForm / useShow (core.customers.organization_id)
 * - schedules: Refine resource, core.schedules.organization_id
 * - tuition_invoices: Refine resource for invoice rows (core.payments.organization_id)
 * - staff: Refine resource for teachers/staff (core.staff.organization_id)
 * dashboard is navigation-only and is not included.
 */
export const TENANT_SCOPED_RESOURCES = [
  "customers", 
  "schedules", 
  "tuition_invoices", 
  "staff",
  "classes",
  "class_members",
  "practice_records"
] as const;

export function isTenantScopedResource(resource: string): boolean {
  return (TENANT_SCOPED_RESOURCES as readonly string[]).includes(resource);
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

function stripOrganizationIdFilters(filters: CrudFilter[]): CrudFilter[] {
  const result: CrudFilter[] = [];
  for (const filter of filters) {
    if ("field" in filter && filter.field === "organization_id") {
      continue;
    }
    if ((filter.operator === "or" || filter.operator === "and") && Array.isArray(filter.value)) {
      const nested = stripOrganizationIdFilters(filter.value);
      if (nested.length === 0) continue;
      result.push({ ...filter, value: nested });
      continue;
    }
    result.push(filter);
  }
  return result;
}

function withoutOrganizationId<T>(variables: T): T {
  const safe = { ...(variables as Record<string, unknown>) };
  delete safe.organization_id;
  return safe as T;
}

/**
 * Wraps an inner DataProvider so tenant-scoped resources cannot be read or written
 * outside the resolved active organization. The inner provider is injectable for tests.
 */
export function guardTenantDataProvider(
  baseProvider: DataProvider,
  resolveOrgId: () => string | null = resolveActiveOrgId
): DataProvider {
  const requireActiveOrgId = (): string => {
    const activeOrgId = resolveOrgId();
    if (!activeOrgId) {
      throw new ActiveOrganizationRequiredError();
    }
    return activeOrgId;
  };

  return {
    ...baseProvider,

    getList: async (params) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.getList(params);
      }

      const activeOrgId = requireActiveOrgId();
      return baseProvider.getList({
        ...params,
        filters: [
          ...stripOrganizationIdFilters(params.filters ?? []),
          {
            field: "organization_id",
            operator: "eq",
            value: activeOrgId,
          },
        ],
      });
    },

    create: async (params) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.create(params);
      }

      const activeOrgId = requireActiveOrgId();
      const variables = {
        ...(params.variables as Record<string, unknown>),
        organization_id: activeOrgId,
      };

      return baseProvider.create({
        ...params,
        variables: variables as typeof params.variables,
      });
    },

    update: async (params) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.update(params);
      }

      requireActiveOrgId();
      return baseProvider.update({
        ...params,
        variables: withoutOrganizationId(params.variables),
      });
    },

    updateMany: async (params) => {
      if (!baseProvider.updateMany) {
        throw new Error("updateMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.updateMany(params);
      }

      requireActiveOrgId();
      return baseProvider.updateMany({
        ...params,
        variables: withoutOrganizationId(params.variables),
      });
    },
  };
}

export function createMoaDataProvider(): DataProvider {
  if (!supabase) {
    return createUnconfiguredDataProvider();
  }

  return guardTenantDataProvider(refineSupabaseDataProvider(supabase));
}

export const dataProvider: DataProvider = createMoaDataProvider();
