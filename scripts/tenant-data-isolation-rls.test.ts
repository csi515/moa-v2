/**
 * Tenant Data Isolation & RLS Client-Side Guard Comprehensive Regression Test
 * Run: npx tsx scripts/tenant-data-isolation-rls.test.ts
 */
import assert from "node:assert/strict";
import type { DataProvider } from "@refinedev/core";
import {
  ActiveOrganizationRequiredError,
  guardTenantDataProvider,
  TENANT_SCOPED_RESOURCES,
  TENANT_COLUMN_MAP,
  getTenantColumnForResource,
  isTenantScopedResource,
} from "../src/providers/dataProvider";
import { createMoaLiveProvider } from "../src/providers/liveProvider";
import { createAccessControlProvider } from "../src/providers/accessControlProvider";

const ACTIVE_ORG = "org-current-111";
const FOREIGN_ORG = "org-foreign-999";

console.log("[TEST] Tenant Data Isolation & RLS Security Suite Starting...");

// -----------------------------------------------------------------------------
// 1. Resource Matrix Completeness Verification
// -----------------------------------------------------------------------------
{
  const expectedResources = [
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
  ];

  for (const res of expectedResources) {
    assert.ok(
      isTenantScopedResource(res),
      `Resource '${res}' must be registered in TENANT_SCOPED_RESOURCES`
    );
  }

  // Tenant column mappings
  assert.equal(getTenantColumnForResource("passes"), "tenant_id");
  assert.equal(getTenantColumnForResource("lockers"), "tenant_id");
  assert.equal(getTenantColumnForResource("session_passes"), "organization_id");
  assert.equal(getTenantColumnForResource("tenant_roles"), "tenant_id");
  assert.equal(getTenantColumnForResource("onboarding_tokens"), "tenant_id");
  assert.equal(getTenantColumnForResource("customers"), "organization_id");
  console.log("  [PASS] 1. Resource Matrix & Column Mappings verified.");
}

// -----------------------------------------------------------------------------
// 2. DataProvider CRUD Tenant Scoping & ID-Swapping Defenses
// -----------------------------------------------------------------------------
{
  type Call = { method: string; params: any };
  const calls: Call[] = [];

  const mockBase: DataProvider = {
    getList: async (p) => {
      calls.push({ method: "getList", params: p });
      return { data: [], total: 0 };
    },
    getOne: async (p) => {
      calls.push({ method: "getOne", params: p });
      const tenantCol = getTenantColumnForResource(p.resource);
      // Return foreign tenant record if ID matches "id-foreign"
      if (p.id === "id-foreign") {
        return { data: { id: p.id, [tenantCol]: FOREIGN_ORG } };
      }
      return { data: { id: p.id, [tenantCol]: ACTIVE_ORG } };
    },
    getMany: async (p) => {
      calls.push({ method: "getMany", params: p });
      const tenantCol = getTenantColumnForResource(p.resource);
      return {
        data: p.ids.map((id) => ({
          id,
          [tenantCol]: id === "id-foreign" ? FOREIGN_ORG : ACTIVE_ORG,
        })),
      };
    },
    create: async (p) => {
      calls.push({ method: "create", params: p });
      return { data: { id: "created-id", ...p.variables } };
    },
    update: async (p) => {
      calls.push({ method: "update", params: p });
      return { data: { id: p.id, ...p.variables } };
    },
    updateMany: async (p) => {
      calls.push({ method: "updateMany", params: p });
      return { data: p.ids.map((id) => ({ id })) };
    },
    deleteOne: async (p) => {
      calls.push({ method: "deleteOne", params: p });
      return { data: { id: p.id } };
    },
    deleteMany: async (p) => {
      calls.push({ method: "deleteMany", params: p });
      return { data: p.ids.map((id) => ({ id })) };
    },
    getApiUrl: () => "https://test.supabase.co",
  };

  const guarded = guardTenantDataProvider(mockBase, () => ACTIVE_ORG);

  // 2.1 getList forces activeOrgId and scrubs nested tenant filters
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    const tenantCol = getTenantColumnForResource(resource);
    await guarded.getList({
      resource,
      filters: [
        { field: tenantCol, operator: "eq", value: FOREIGN_ORG },
        { field: "organization_id", operator: "eq", value: FOREIGN_ORG },
        { field: "tenant_id", operator: "eq", value: FOREIGN_ORG },
        {
          operator: "or",
          value: [{ field: tenantCol, operator: "eq", value: FOREIGN_ORG }],
        },
      ],
    });

    const lastCall = calls[calls.length - 1];
    assert.equal(lastCall.method, "getList");
    const activeFilters = lastCall.params.filters.filter(
      (f: any) => f.field === tenantCol
    );
    assert.equal(activeFilters.length, 1);
    assert.equal(activeFilters[0].value, ACTIVE_ORG);
  }

  // 2.2 ID Swapping Defense: getOne rejects foreign tenant record
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    await assert.rejects(
      () => guarded.getOne({ resource, id: "id-foreign" }),
      (err: any) => err.message.includes("does not belong to active organization")
    );
  }

  // 2.3 ID Swapping Defense: getMany rejects batch containing foreign record
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    await assert.rejects(
      () => guarded.getMany!({ resource, ids: ["id-ok", "id-foreign"] }),
      (err: any) => err.message.includes("do not belong to active organization")
    );
  }

  // 2.4 Mutation Defense: update rejects mutating foreign tenant record
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    await assert.rejects(
      () => guarded.update({ resource, id: "id-foreign", variables: { status: "hack" } }),
      (err: any) => err.message.includes("does not belong to active organization")
    );
  }

  // 2.5 Mutation Defense: updateMany rejects modifying batch containing foreign record
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    await assert.rejects(
      () =>
        guarded.updateMany!({
          resource,
          ids: ["id-foreign"],
          variables: { status: "hack" },
        }),
      (err: any) => err.message.includes("do not belong to active organization")
    );
  }

  // 2.6 Deletion Defense: deleteOne and deleteMany reject deleting foreign tenant record
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    await assert.rejects(
      () => guarded.deleteOne!({ resource, id: "id-foreign" }),
      (err: any) => err.message.includes("does not belong to active organization")
    );
    await assert.rejects(
      () => guarded.deleteMany!({ resource, ids: ["id-foreign"] }),
      (err: any) => err.message.includes("do not belong to active organization")
    );
  }

  // 2.7 Creation Tenant Injection: create scrubs spoofed IDs and injects activeOrgId
  for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
    const tenantCol = getTenantColumnForResource(resource);
    const created = await guarded.create({
      resource,
      variables: {
        name: "test-row",
        organization_id: FOREIGN_ORG,
        tenant_id: FOREIGN_ORG,
      },
    });

    assert.equal(created.data[tenantCol], ACTIVE_ORG);
    const otherCol = tenantCol === "tenant_id" ? "organization_id" : "tenant_id";
    assert.equal(created.data[otherCol], undefined);
  }

  // 2.8 Fail-Closed on Unauthenticated / Unresolved Org
  const unauthed = guardTenantDataProvider(mockBase, () => null);
  await assert.rejects(
    () => unauthed.getList({ resource: "customers" }),
    ActiveOrganizationRequiredError
  );
  await assert.rejects(
    () => unauthed.getOne({ resource: "passes", id: "1" }),
    ActiveOrganizationRequiredError
  );
  await assert.rejects(
    () => unauthed.create({ resource: "lockers", variables: {} }),
    ActiveOrganizationRequiredError
  );

  console.log("  [PASS] 2. DataProvider CRUD Tenant Scoping & ID Swapping Defenses verified.");
}

// -----------------------------------------------------------------------------
// 3. LiveProvider Realtime Cross-Tenant Leakage Defenses
// -----------------------------------------------------------------------------
{
  let channelConfig: any = null;
  let registeredListener: ((payload: any) => void) | null = null;

  const mockChannel = {
    on: (_event: string, config: any, listener: any) => {
      channelConfig = config;
      registeredListener = listener;
      return mockChannel;
    },
    subscribe: () => ({ id: "mock-active-channel" }),
  };

  const mockClient: any = {
    channel: () => mockChannel,
  };

  // 3.1 Normal active tenant subscription has tenant filter
  const live = createMoaLiveProvider(mockClient, {
    resolveOrgId: () => ACTIVE_ORG,
  });

  live.subscribe({
    channel: "resources/passes",
    types: ["*"],
    callback: () => {},
  });

  assert.equal(channelConfig.table, "passes");
  assert.equal(channelConfig.filter, `tenant_id=eq.${ACTIVE_ORG}`);

  // 3.2 Listener suppresses foreign tenant events (Defense-in-depth)
  let callbackInvoked = false;
  live.subscribe({
    channel: "resources/session_passes",
    types: ["*"],
    callback: () => {
      callbackInvoked = true;
    },
  });

  assert.ok(registeredListener);
  // Send foreign event
  registeredListener({
    eventType: "INSERT",
    commit_timestamp: "2026-10-10T00:00:00Z",
    new: { id: "p-foreign", organization_id: FOREIGN_ORG },
  });
  assert.equal(callbackInvoked, false, "Realtime event for foreign tenant must be suppressed");

  // Send own event
  registeredListener({
    eventType: "INSERT",
    commit_timestamp: "2026-10-10T00:00:00Z",
    new: { id: "p-own", organization_id: ACTIVE_ORG },
  });
  assert.equal(callbackInvoked, true, "Realtime event for active tenant must be delivered");

  // 3.3 Fail-Closed: Missing activeOrgId returns safe no-op channel without subscribing
  const unauthedLive = createMoaLiveProvider(mockClient, {
    resolveOrgId: () => null,
  });

  const noopChannel = unauthedLive.subscribe({
    channel: "resources/customers",
    types: ["*"],
    callback: () => {},
  });
  assert.equal(noopChannel.id, "unscoped-customers-noop-channel");

  console.log("  [PASS] 3. LiveProvider Realtime Cross-Tenant Leakage Defenses verified.");
}

// -----------------------------------------------------------------------------
// 4. AccessControlProvider Fail-Closed Tenant Resolution
// -----------------------------------------------------------------------------
{
  const ac = createAccessControlProvider({
    getActiveUser: () => null,
    getOrganizationId: () => null,
  });

  const unauthedResult = await ac.can({ resource: "customers", action: "list" });
  assert.equal(unauthedResult.can, false);
  assert.match(unauthedResult.reason || "", /로그인이 필요합니다/);

  const noOrgAc = createAccessControlProvider({
    getActiveUser: () => ({ id: "user-1", email: "u@t.com", role: "staff" } as any),
    getOrganizationId: () => null,
  });
  const noOrgResult = await noOrgAc.can({ resource: "customers", action: "list" });
  assert.equal(noOrgResult.can, false);
  assert.match(noOrgResult.reason || "", /소속 사업장을 선택해 주세요/);

  console.log("  [PASS] 4. AccessControlProvider Fail-Closed Tenant Resolution verified.");
}

console.log("\n[TEST] ALL 4 SUITES PASSED! Tenant isolation and RLS regression defenses confirmed.");
