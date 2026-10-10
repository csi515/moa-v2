/**
 * Active-org guard for the Refine data provider.
 * Run: npx tsx src/providers/dataProvider.test.ts
 */
import assert from "node:assert/strict";
import type { DataProvider } from "@refinedev/core";
import {
  ActiveOrganizationRequiredError,
  guardTenantDataProvider,
  TENANT_SCOPED_RESOURCES,
  getTenantColumnForResource,
} from "./dataProvider";

const ACTIVE_ORG = "org-active";
const FOREIGN_ORG = "org-foreign";

type Call = { method: string; params: any };

function mockBaseProvider(): DataProvider & { calls: Call[] } {
  const calls: Call[] = [];
  const record = (method: string, params: any) => {
    calls.push({ method, params });
    return params;
  };
  return {
    calls,
    getList: async (params) => {
      record("getList", params);
      return { data: [], total: 0 };
    },
    getOne: async (params) => {
      record("getOne", params);
      return { data: { id: params.id } };
    },
    create: async (params) => {
      record("create", params);
      return { data: { id: "new", ...params.variables } };
    },
    update: async (params) => {
      record("update", params);
      return { data: { id: params.id, ...params.variables } };
    },
    updateMany: async (params) => {
      record("updateMany", params);
      return { data: params.ids.map((id) => ({ id })) };
    },
    deleteOne: async (params) => {
      record("deleteOne", params);
      return { data: { id: params.id } };
    },
    getApiUrl: () => "https://test.supabase.co",
  };
}

function tenantFilters(params: any, tenantColumn: string) {
  return (params.filters ?? []).filter((f: any) => f.field === tenantColumn);
}

async function testDataProviderGuard() {
  assert.deepEqual(
    [...TENANT_SCOPED_RESOURCES],
    [
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
    ]
  );

  for (const resource of TENANT_SCOPED_RESOURCES) {
    const tenantColumn = getTenantColumnForResource(resource);
    const base = mockBaseProvider();
    const provider = guardTenantDataProvider(base, () => ACTIVE_ORG);

    await provider.getList({
      resource,
      filters: [
        { field: tenantColumn, operator: "eq", value: FOREIGN_ORG },
        { field: "organization_id", operator: "eq", value: FOREIGN_ORG },
        { field: "tenant_id", operator: "eq", value: FOREIGN_ORG },
        { field: "status", operator: "eq", value: "active" },
        {
          operator: "or",
          value: [
            { field: tenantColumn, operator: "eq", value: FOREIGN_ORG },
            { field: "name", operator: "contains", value: "kim" },
          ],
        },
      ],
    });

    const getList = base.calls.find((c) => c.method === "getList");
    assert.ok(getList, `${resource} getList reached the inner provider`);
    const tenant = tenantFilters(getList.params, tenantColumn);
    assert.equal(tenant.length, 1, `${resource} keeps a single ${tenantColumn} filter`);
    assert.equal(tenant[0].operator, "eq");
    assert.equal(tenant[0].value, ACTIVE_ORG, `${resource} overwrites a foreign ${tenantColumn}`);
    assert.ok(
      getList.params.filters.some((f: any) => f.field === "status" && f.value === "active")
    );
    const nested = getList.params.filters.find((f: any) => f.operator === "or");
    assert.deepEqual(nested.value, [{ field: "name", operator: "contains", value: "kim" }]);

    await provider.getOne({
      resource,
      id: "row-1",
    });
    const gotOne = base.calls.find((c) => c.method === "getOne");
    assert.ok(gotOne, `${resource} getOne reached the inner provider`);

    await provider.create({
      resource,
      variables: { name: "row", [tenantColumn]: FOREIGN_ORG, organization_id: FOREIGN_ORG, tenant_id: FOREIGN_ORG },
    });
    const created = base.calls.find((c) => c.method === "create");
    assert.equal(created.params.variables[tenantColumn], ACTIVE_ORG);
    assert.equal(created.params.variables.name, "row");

    await provider.update({
      resource,
      id: "row-1",
      variables: { name: "edited", [tenantColumn]: FOREIGN_ORG, organization_id: FOREIGN_ORG, tenant_id: FOREIGN_ORG },
    });
    const updated = base.calls.find((c) => c.method === "update");
    assert.equal(updated.params.variables.organization_id, undefined);
    assert.equal(updated.params.variables.tenant_id, undefined);
    assert.equal(updated.params.variables.name, "edited");

    await provider.updateMany({
      resource,
      ids: ["row-1", "row-2"],
      variables: { status: "inactive", [tenantColumn]: FOREIGN_ORG, organization_id: FOREIGN_ORG, tenant_id: FOREIGN_ORG },
    });
    const updatedMany = base.calls.find((c) => c.method === "updateMany");
    assert.equal(updatedMany.params.variables.organization_id, undefined);
    assert.equal(updatedMany.params.variables.tenant_id, undefined);
    assert.equal(updatedMany.params.variables.status, "inactive");
    assert.deepEqual(updatedMany.params.ids, ["row-1", "row-2"]);

    await provider.deleteOne({
      resource,
      id: "row-1",
    });
    const deleted = base.calls.find((c) => c.method === "deleteOne");
    assert.ok(deleted, `${resource} deleteOne reached the inner provider`);
  }

  // Cross-tenant data isolation and ID swapping rejection tests
  {
    for (const resource of ["customers", "passes", "lockers", "session_passes"]) {
      const tenantColumn = getTenantColumnForResource(resource);

      // 1. getOne rejects foreign tenant record
      {
        const foreignBase: any = {
          getOne: async () => ({ data: { id: "row-foreign", [tenantColumn]: FOREIGN_ORG } }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () => guarded.getOne({ resource, id: "row-foreign" }),
          (err: any) => err.message.includes("does not belong to active organization")
        );
      }

      // 2. getMany rejects when any record belongs to foreign tenant
      {
        const foreignBase: any = {
          getMany: async () => ({
            data: [
              { id: "row-1", [tenantColumn]: ACTIVE_ORG },
              { id: "row-2", [tenantColumn]: FOREIGN_ORG },
            ],
          }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () => guarded.getMany!({ resource, ids: ["row-1", "row-2"] }),
          (err: any) => err.message.includes("do not belong to active organization")
        );
      }

      // 3. update rejects modifying foreign tenant record
      {
        const foreignBase: any = {
          getOne: async () => ({ data: { id: "row-foreign", [tenantColumn]: FOREIGN_ORG } }),
          update: async () => ({ data: { id: "row-foreign" } }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () => guarded.update({ resource, id: "row-foreign", variables: { status: "hacked" } }),
          (err: any) => err.message.includes("does not belong to active organization")
        );
      }

      // 4. updateMany rejects when target includes foreign tenant record
      {
        const foreignBase: any = {
          getMany: async () => ({
            data: [{ id: "row-foreign", [tenantColumn]: FOREIGN_ORG }],
          }),
          updateMany: async () => ({ data: [{ id: "row-foreign" }] }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () =>
            guarded.updateMany!({
              resource,
              ids: ["row-foreign"],
              variables: { status: "hacked" },
            }),
          (err: any) => err.message.includes("do not belong to active organization")
        );
      }

      // 5. deleteOne rejects deleting foreign tenant record
      {
        const foreignBase: any = {
          getOne: async () => ({ data: { id: "row-foreign", [tenantColumn]: FOREIGN_ORG } }),
          deleteOne: async () => ({ data: { id: "row-foreign" } }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () => guarded.deleteOne!({ resource, id: "row-foreign" }),
          (err: any) => err.message.includes("does not belong to active organization")
        );
      }

      // 6. deleteMany rejects deleting foreign tenant record
      {
        const foreignBase: any = {
          getMany: async () => ({
            data: [{ id: "row-foreign", [tenantColumn]: FOREIGN_ORG }],
          }),
          deleteMany: async () => ({ data: [{ id: "row-foreign" }] }),
        };
        const guarded = guardTenantDataProvider(foreignBase, () => ACTIVE_ORG);
        await assert.rejects(
          () => guarded.deleteMany!({ resource, ids: ["row-foreign"] }),
          (err: any) => err.message.includes("do not belong to active organization")
        );
      }
    }
  }

  {
    const base = mockBaseProvider();
    const provider = guardTenantDataProvider(base, () => null);
    for (const resource of TENANT_SCOPED_RESOURCES) {
      await assert.rejects(
        () => provider.getList({ resource, filters: [{ field: "organization_id", operator: "eq", value: FOREIGN_ORG }] }),
        ActiveOrganizationRequiredError
      );
      await assert.rejects(
        () => provider.getOne({ resource, id: "1" }),
        ActiveOrganizationRequiredError
      );
      await assert.rejects(
        () => provider.create({ resource, variables: { name: "x", organization_id: FOREIGN_ORG } }),
        ActiveOrganizationRequiredError
      );
      await assert.rejects(
        () => provider.update({ resource, id: "1", variables: { organization_id: FOREIGN_ORG } }),
        ActiveOrganizationRequiredError
      );
      await assert.rejects(
        () => provider.updateMany({ resource, ids: ["1"], variables: { organization_id: FOREIGN_ORG } }),
        ActiveOrganizationRequiredError
      );
      await assert.rejects(
        () => provider.deleteOne({ resource, id: "1" }),
        ActiveOrganizationRequiredError
      );
    }
    assert.equal(base.calls.length, 0, "fail closed does not call the inner provider");
  }

  {
    const base = mockBaseProvider();
    const provider = guardTenantDataProvider(base, () => null);
    await provider.getList({
      resource: "dashboard",
      filters: [{ field: "organization_id", operator: "eq", value: FOREIGN_ORG }],
    });
    await provider.create({
      resource: "dashboard",
      variables: { name: "other", organization_id: FOREIGN_ORG },
    });
    assert.equal(base.calls[0].params.filters[0].value, FOREIGN_ORG);
    assert.equal(base.calls[1].params.variables.organization_id, FOREIGN_ORG);
  }

  console.log("[test:data-provider] all assertions passed");
}

testDataProviderGuard().catch((error) => {
  console.error(error);
  process.exit(1);
});
