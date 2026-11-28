import { dataProvider as refineSupabaseDataProvider } from "@refinedev/supabase";
import type { BaseRecord, CrudFilter, DataProvider, GetManyParams, GetOneParams } from "@refinedev/core";
import { getCoreClient, supabase } from "@/lib/supabase/client";
import { parseSupabaseError } from "@/shared/errors/supabaseErrorParser";
import * as orgService from "@/core/organizations/services/organizationService";
import { StorageService } from "@/services/storage";
import { notifyStorageFromRefineResource } from "@/core/query/crossCacheBridge";

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
  "treatment_charts",
  "session_passes",
  "tenant_roles",
  "onboarding_tokens",
  "attendance_sessions",
  "services",
  "reservations",
  "events",
  "tenant_operating_hours",
  "mbo_objectives",
  "mbo_projects",
  "project_categories",
  "research_projects",
  "research_project_members",
  "research_project_deliverables",
  "research_project_gates",
  "mbo_progress_logs",
  "mbo_feedback_comments",
  "mbo_evaluations",
  "approval_requests",
  "approval_templates",
  "approval_steps",
  "task_orders",
  "task_order_timelines",
  "checklist_templates",
  "checklist_items",
  "purchase_requisitions",
  "vendor_quotes",
  "stock_lots",
  "stock_movements",
  "quality_inspection_standards",
  "quality_inspection_records",
  "change_orders",
  "change_order_evaluations",
  "anonymous_grievances",
  "resource_types",
  "patents",
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
  tenant_roles: "tenant_id",
  tenant_operating_hours: "tenant_id",
};

const dynamicTenantScopedResources = new Set<string>(TENANT_SCOPED_RESOURCES);
const dynamicTenantColumnMap = new Map<string, string>(Object.entries(TENANT_COLUMN_MAP));

/**
 * 신규 Capability가 추가될 때 해당 기능의 테넌트 스코프 리소스 및 컬럼을 동적으로 등록
 */
export function registerTenantScopedResource(resource: string, tenantColumn: string = "organization_id"): void {
  dynamicTenantScopedResources.add(resource);
  if (tenantColumn !== "organization_id") {
    dynamicTenantColumnMap.set(resource, tenantColumn);
  }
}

export function registerTenantScopedResources(resources: string[] | Record<string, string>): void {
  if (Array.isArray(resources)) {
    for (const r of resources) dynamicTenantScopedResources.add(r);
  } else {
    for (const [r, col] of Object.entries(resources)) {
      dynamicTenantScopedResources.add(r);
      if (col !== "organization_id") dynamicTenantColumnMap.set(r, col);
    }
  }
}

export function getTenantColumnForResource(resource: string): string {
  return dynamicTenantColumnMap.get(resource) ?? TENANT_COLUMN_MAP[resource] ?? "organization_id";
}

/**
 * 주어진 리소스가 테넌트 격리 대상인지 판정.
 * 등록된 리소스뿐만 아니라, 향후 새롭게 추가되는 비즈니스 리소스도 기본적으로 테넌트 격리 대상으로 보호 (Fail-Closed Default).
 */
export function isTenantScopedResource(resource: string): boolean {
  if (!resource) return false;
  // 공개 또는 인증/내비게이션 전용 리소스는 제외
  if (
    resource === "auth" ||
    resource === "public" ||
    resource === "public_organizations" ||
    resource === "public_consultations" ||
    resource === "dashboard" ||
    resource === "account" ||
    resource === "settings"
  ) {
    return false;
  }
  // 동적 등록 세트에 포함되어 있으면 즉시 true
  if (dynamicTenantScopedResources.has(resource)) return true;
  // 기본 배열에 포함되어 있으면 true
  if ((TENANT_SCOPED_RESOURCES as readonly string[]).includes(resource)) return true;
  // 신규 Capability가 등록한 리소스도 기본적으로 테넌트 스코프로 보호
  return true;
}

/**
 * Record에서 테넌트 식별자 추출.
 * preferredColumn(예: tenant_id)을 우선 읽고, 없으면 상호 호환 컬럼(organization_id)을 fallback으로 해석.
 */
export function extractTenantId(data: unknown, preferredColumn: string): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const val = record[preferredColumn];
  if (typeof val === "string" && val.trim().length > 0) return val;
  const fallbackCol = preferredColumn === "tenant_id" ? "organization_id" : "tenant_id";
  const fallbackVal = record[fallbackCol];
  if (typeof fallbackVal === "string" && fallbackVal.trim().length > 0) return fallbackVal;
  return null;
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

    getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.getOne<TData>(params);
      }
      const activeOrgId = requireActiveOrgId();
      const res = await baseProvider.getOne<TData>(params);
      const tenantColumn = getTenantColumnForResource(params.resource);
      const recordTenantId = extractTenantId(res?.data, tenantColumn);
      if (res?.data && recordTenantId && recordTenantId !== activeOrgId) {
        throw new Error(`Record ${params.id} does not belong to active organization.`);
      }
      return res;
    },

    getMany: async <TData extends BaseRecord = BaseRecord>(params: GetManyParams) => {
      if (!baseProvider.getMany) {
        throw new Error("getMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.getMany<TData>(params);
      }
      const activeOrgId = requireActiveOrgId();
      const res = await baseProvider.getMany<TData>(params);
      const tenantColumn = getTenantColumnForResource(params.resource);
      if (res?.data && Array.isArray(res.data)) {
        const foreign = res.data.some((row: any) => {
          const rowTenantId = extractTenantId(row, tenantColumn);
          return row && rowTenantId && rowTenantId !== activeOrgId;
        });
        if (foreign) {
          throw new Error(`One or more requested records do not belong to active organization.`);
        }
      }
      return res;
    },

    create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.create<TData, TVariables>(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);
      const variables = {
        ...withoutTenantId(params.variables),
        [tenantColumn]: activeOrgId,
      };

      const res = await baseProvider.create<TData, TVariables>({
        ...params,
        variables: variables as typeof params.variables,
      });
      notifyStorageFromRefineResource(params.resource);
      return res;
    },

    update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any) => {
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.update<TData, TVariables>(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);

      // Verify the record belongs to the active tenant before update
      if (baseProvider.getOne) {
        try {
          const existing = await baseProvider.getOne({
            resource: params.resource,
            id: params.id,
            meta: params.meta,
          });
          const existingTenantId = extractTenantId(existing?.data, tenantColumn);
          if (existing?.data && existingTenantId && existingTenantId !== activeOrgId) {
            throw new Error(`Record ${params.id} does not belong to active organization.`);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes("does not belong to active organization")) {
            throw err;
          }
        }
      }

      const res = await baseProvider.update<TData, TVariables>({
        ...params,
        variables: withoutTenantId(params.variables),
      });
      notifyStorageFromRefineResource(params.resource);
      return res;
    },

    updateMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any) => {
      if (!baseProvider.updateMany) {
        throw new Error("updateMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.updateMany<TData, TVariables>(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);

      if (baseProvider.getMany) {
        try {
          const existing = await baseProvider.getMany({
            resource: params.resource,
            ids: params.ids,
            meta: params.meta,
          });
          if (existing?.data && Array.isArray(existing.data)) {
            const foreign = existing.data.some((row: any) => {
              const rowTenantId = extractTenantId(row, tenantColumn);
              return row && rowTenantId && rowTenantId !== activeOrgId;
            });
            if (foreign) {
              throw new Error(`One or more requested records do not belong to active organization.`);
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes("do not belong to active organization")) {
            throw err;
          }
        }
      }

      const res = await baseProvider.updateMany<TData, TVariables>({
        ...params,
        variables: withoutTenantId(params.variables),
      });
      notifyStorageFromRefineResource(params.resource);
      return res;
    },

    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any) => {
      if (!baseProvider.deleteOne) {
        throw new Error("deleteOne is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.deleteOne<TData, TVariables>(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);

      // Verify the record belongs to the active tenant before delete
      if (baseProvider.getOne) {
        try {
          const existing = await baseProvider.getOne({
            resource: params.resource,
            id: params.id,
            meta: params.meta,
          });
          const existingTenantId = extractTenantId(existing?.data, tenantColumn);
          if (existing?.data && existingTenantId && existingTenantId !== activeOrgId) {
            throw new Error(`Record ${params.id} does not belong to active organization.`);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes("does not belong to active organization")) {
            throw err;
          }
        }
      }

      // customers 는 RLS WITH CHECK(deleted_at IS NULL) 때문에 클라이언트 UPDATE 로
      // deleted_at 을 쓸 수 없다. meta.softDelete 일 때만 SECURITY DEFINER RPC 로 숨긴다.
      if (params.resource === "customers" && params.meta?.softDelete === true) {
        const { error } = await getCoreClient().rpc("soft_delete_record" as never, {
          p_table_name: "customers",
          p_record_id: params.id,
        } as never);
        if (error) {
          throw new Error(
            parseSupabaseError(error, { entity: "고객", action: "삭제" }).userMessage
          );
        }
        notifyStorageFromRefineResource(params.resource);
        return { data: { id: params.id } as TData };
      }

      const res = await baseProvider.deleteOne<TData, TVariables>(params);
      notifyStorageFromRefineResource(params.resource);
      return res;
    },

    deleteMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(params: any) => {
      if (!baseProvider.deleteMany) {
        throw new Error("deleteMany is not implemented");
      }
      if (!isTenantScopedResource(params.resource)) {
        return baseProvider.deleteMany<TData, TVariables>(params);
      }

      const activeOrgId = requireActiveOrgId();
      const tenantColumn = getTenantColumnForResource(params.resource);

      if (baseProvider.getMany) {
        try {
          const existing = await baseProvider.getMany({
            resource: params.resource,
            ids: params.ids,
            meta: params.meta,
          });
          if (existing?.data && Array.isArray(existing.data)) {
            const foreign = existing.data.some((row: any) => {
              const rowTenantId = extractTenantId(row, tenantColumn);
              return row && rowTenantId && rowTenantId !== activeOrgId;
            });
            if (foreign) {
              throw new Error(`One or more requested records do not belong to active organization.`);
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes("do not belong to active organization")) {
            throw err;
          }
        }
      }

      const res = await baseProvider.deleteMany<TData, TVariables>(params);
      notifyStorageFromRefineResource(params.resource);
      return res;
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
