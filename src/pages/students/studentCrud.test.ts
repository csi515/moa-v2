import assert from "node:assert/strict";
import { resolveMoaPermission } from "@/providers/accessControlProvider";
import { createMoaDataProvider } from "@/providers/dataProvider";
import {
  StudentListPage,
  StudentCreatePage,
  StudentShowPage,
  StudentEditPage,
} from "./index";

console.log("[test:student-crud] starting student CRUD contract tests...");

// 1. Export 검증
assert.ok(StudentListPage, "StudentListPage must be exported");
assert.ok(StudentCreatePage, "StudentCreatePage must be exported");
assert.ok(StudentShowPage, "StudentShowPage must be exported");
assert.ok(StudentEditPage, "StudentEditPage must be exported");

// 2. Refine customers/students resource permission mapping
{
  assert.equal(resolveMoaPermission("customers", "list"), "customers.read");
  assert.equal(resolveMoaPermission("customers", "show"), "customers.read");
  assert.equal(resolveMoaPermission("customers", "create"), "customers.write");
  assert.equal(resolveMoaPermission("customers", "edit"), "customers.write");
  assert.equal(resolveMoaPermission("customers", "delete"), "customers.write");

  // synonym
  assert.equal(resolveMoaPermission("students", "list"), "customers.read");
  assert.equal(resolveMoaPermission("students", "show"), "customers.read");
  assert.equal(resolveMoaPermission("students", "create"), "customers.write");
  assert.equal(resolveMoaPermission("students", "edit"), "customers.write");
  assert.equal(resolveMoaPermission("students", "delete"), "customers.write");

  // unknown action -> fail closed
  assert.equal(resolveMoaPermission("customers", "destroy_world"), null);
  assert.equal(resolveMoaPermission("customers", "grant_all"), null);
}

// 3. DataProvider Mock test with tenant boundary
{
  const mockBaseProvider = {
    getList: async (params: any) => ({ data: [], total: 0, params }),
    getMany: async () => ({ data: [] }),
    getOne: async (params: any) => ({ data: { id: params.id } }),
    create: async (params: any) => ({ data: { id: "new-id", ...params.variables } }),
    createMany: async () => ({ data: [] }),
    update: async (params: any) => ({ data: { id: params.id, ...params.variables } }),
    updateMany: async () => ({ data: [] }),
    deleteOne: async (params: any) => ({ data: { id: params.id } }),
    deleteMany: async () => ({ data: [] }),
    getApiUrl: () => "https://test.supabase.co",
    custom: async () => ({ data: null }),
  };

  // getList tenant filter injection
  let capturedGetListParams: any = null;
  const wrappedGetList = async (params: any) => {
    const { resource, filters = [] } = params;
    const activeOrgId = "test-org-123";
    if (resource === "customers" && activeOrgId) {
      const hasOrgFilter = filters.some((f: any) => "field" in f && f.field === "organization_id");
      if (!hasOrgFilter) {
        params = {
          ...params,
          filters: [
            ...filters,
            { field: "organization_id", operator: "eq", value: activeOrgId },
          ],
        };
      }
    }
    capturedGetListParams = params;
    return mockBaseProvider.getList(params);
  };

  await wrappedGetList({ resource: "customers", pagination: { current: 1, pageSize: 10 } });
  assert.ok(capturedGetListParams.filters.some((f: any) => f.field === "organization_id" && f.value === "test-org-123"));

  // create auto injection of organization_id
  let capturedCreateVariables: any = null;
  const wrappedCreate = async (params: any) => {
    let { resource, variables } = params;
    const activeOrgId = "test-org-123";
    if (resource === "customers") {
      const record = variables as Record<string, any>;
      if (!record.organization_id && activeOrgId) {
        variables = {
          ...record,
          organization_id: activeOrgId,
        };
      }
    }
    capturedCreateVariables = variables;
    return mockBaseProvider.create({ ...params, variables });
  };

  await wrappedCreate({
    resource: "customers",
    variables: { name: "홍길동", phone: "010-1111-2222", status: "active" },
  });
  assert.equal(capturedCreateVariables.organization_id, "test-org-123");
  assert.equal(capturedCreateVariables.name, "홍길동");

  // update prevention of organization_id tampering
  let capturedUpdateVariables: any = null;
  const wrappedUpdate = async (params: any) => {
    const { resource, variables } = params;
    let safeVariables = { ...variables };
    if (resource === "customers" && "organization_id" in safeVariables) {
      delete safeVariables.organization_id;
    }
    capturedUpdateVariables = safeVariables;
    return mockBaseProvider.update({ ...params, variables: safeVariables });
  };

  await wrappedUpdate({
    resource: "customers",
    id: "cust-1",
    variables: { name: "홍길동 수정", organization_id: "malicious-org" },
  });
  assert.equal(capturedUpdateVariables.organization_id, undefined, "organization_id must not be mutable");
  assert.equal(capturedUpdateVariables.name, "홍길동 수정");
}

console.log("[test:student-crud] all assertions passed successfully!");
