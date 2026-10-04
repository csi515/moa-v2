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

function orgFilters(params: any) {
  return (params.filters ?? []).filter((f: any) => f.field === "organization_id");
}

async function testDataProviderGuard() {
  assert.deepEqual(
    [...TENANT_SCOPED_RESOURCES],
    ["customers", "schedules", "tuition_invoices"]
  );

  for (const resource of TENANT_SCOPED_RESOURCES) {
    const base = mockBaseProvider();
    const provider = guardTenantDataProvider(base, () => ACTIVE_ORG);

    await provider.getList({
      resource,
      filters: [
        { field: "organization_id", operator: "eq", value: FOREIGN_ORG },
        { field: "status", operator: "eq", value: "active" },
        {
          operator: "or",
          value: [
            { field: "organization_id", operator: "eq", value: FOREIGN_ORG },
            { field: "name", operator: "contains", value: "kim" },
          ],
        },
      ],
    });

    const getList = base.calls.find((c) => c.method === "getList");
    assert.ok(getList, `${resource} getList reached the inner provider`);
    const org = orgFilters(getList.params);
    assert.equal(org.length, 1, `${resource} keeps a single organization_id filter`);
    assert.equal(org[0].operator, "eq");
    assert.equal(org[0].value, ACTIVE_ORG, `${resource} overwrites a foreign organization_id`);
    assert.ok(
      getList.params.filters.some((f: any) => f.field === "status" && f.value === "active")
    );
    const nested = getList.params.filters.find((f: any) => f.operator === "or");
    assert.deepEqual(nested.value, [{ field: "name", operator: "contains", value: "kim" }]);

    await provider.create({
      resource,
      variables: { name: "row", organization_id: FOREIGN_ORG },
    });
    const created = base.calls.find((c) => c.method === "create");
    assert.equal(created.params.variables.organization_id, ACTIVE_ORG);
    assert.equal(created.params.variables.name, "row");

    await provider.update({
      resource,
      id: "row-1",
      variables: { name: "edited", organization_id: FOREIGN_ORG },
    });
    const updated = base.calls.find((c) => c.method === "update");
    assert.equal(updated.params.variables.organization_id, undefined);
    assert.equal(updated.params.variables.name, "edited");

    await provider.updateMany({
      resource,
      ids: ["row-1", "row-2"],
      variables: { status: "inactive", organization_id: FOREIGN_ORG },
    });
    const updatedMany = base.calls.find((c) => c.method === "updateMany");
    assert.equal(updatedMany.params.variables.organization_id, undefined);
    assert.equal(updatedMany.params.variables.status, "inactive");
    assert.deepEqual(updatedMany.params.ids, ["row-1", "row-2"]);
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
      resource: "staff",
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
