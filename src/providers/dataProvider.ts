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
  "practice_records",
  "passes",
  "lockers",
  "bookings",
  "attendance",
  "billing_invoices",
  "consultations",
  "credit_wallets",
  "instructors",
  "inventory_items",
  "simple_ledgers",
  "maintenance_checklists",
  "rental_equipments",
  "safety_consents",
  "seat_rooms",
  "shift_schedules",
  "task_pipelines",
  "treatment_charts"
] as const;

export const TENANT_COLUMN_MAP: Record<string, string> = {
  passes: "tenant_id",
  lockers: "tenant_id",
  seat_rooms: "tenant_id",
  rental_equipments: "tenant_id",
  maintenance_checklists: "tenant_id",
  credit_wallets: "tenant_id",
  safety_consents: "tenant_id",
  onboarding_tokens: "tenant_id",
};

export function getTenantColumnForResource(resource: string): string {
  return TENANT_COLUMN_MAP[resource] ?? "organization_id";
}

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

function stripTenantFilters(filters: CrudFilter[]): CrudFilter[] {
  const result: CrudFilter[] = [];
  for (const filter of filters) {
    if ("field" in filter && (filter.field === "organization_id" || filter.field === "tenant_id")) {
      continue;
    }
    if ((filter.operator === "or" || filter.operator === "and") && Array.isArray(filter.value)) {
      const nested = stripTenantFilters(filter.value);
      if (nested.length === 0) continue;
      result.push({ ...filter, value: nested });
      continue;
    }
    result.push(filter);
  }
  return result;
}

function withoutTenantId<T>(variables: T): T {
  const safe = { ...(variables as Record<string, unknown>) };
  delete safe.organization_id;
  delete safe.tenant_id;
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
      const tenantColumn = getTenantColumnForResource(params.resource);
      return baseProvider.getList({
        ...params,
        filters: [
          ...stripTenantFilters(params.filters ?? []),
          {
            field: tenantColumn,
            operator: "eq",
            value: activeOrgId,
          },
        ],
      });
    },

    getOne: async (params) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.getOne(params);
      }
      requireActiveOrgId();
      return baseProvider.getOne(params);
    },

    getMany: async (params) => {
      if (!baseProvider.getMany) {
        throw new Error("getMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.getMany(params);
      }
      requireActiveOrgId();
      return baseProvider.getMany(params);
    },

    create: async (params) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.create(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);
      const variables = {
        ...(params.variables as Record<string, unknown>),
        [tenantColumn]: activeOrgId,
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
        variables: withoutTenantId(params.variables),
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
        variables: withoutTenantId(params.variables),
      });
    },

    deleteOne: async (params) => {
      if (!baseProvider.deleteOne) {
        throw new Error("deleteOne is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.deleteOne(params);
      }
      requireActiveOrgId();
      return baseProvider.deleteOne(params);
    },

    deleteMany: async (params) => {
      if (!baseProvider.deleteMany) {
        throw new Error("deleteMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.deleteMany(params);
      }
      requireActiveOrgId();
      return baseProvider.deleteMany(params);
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
