/**
 * Refine accessControlProvider와 MOA Authorization 연동 단위 테스트
 * 실행: npx tsx src/providers/accessControlProvider.test.ts
 */
import assert from "node:assert/strict";
import {
  createAccessControlProvider,
  resolveMoaPermission,
  bindAccessControlContextResolver,
} from "./accessControlProvider";
import type { AuthorizationGrant } from "@/core/authorization/types";
import type { User } from "@/types";

const ORG_A = "org-111";
const ORG_B = "org-222";
const LOC_1 = "loc-aaa";
const LOC_2 = "loc-bbb";
const CUST_1 = "cust-111";
const CUST_2 = "cust-222";
const RES_1 = "res-111";
const RES_2 = "res-222";

function mockUser(role: string | null, overrides: Partial<User> = {}): User {
  return {
    id: "usr-test-1",
    email: "test@example.com",
    name: "테스트 사용자",
    role: role as any,
    ...overrides,
  };
}

async function testAccessControl() {
  // ---------------------------------------------------------------------------
  // 1. Permission Mapping & Fail-Closed 검증
  // ---------------------------------------------------------------------------
  // students / customers
  assert.equal(resolveMoaPermission("students", "list"), "customers.read");
  assert.equal(resolveMoaPermission("students", "show"), "customers.read");
  assert.equal(resolveMoaPermission("students", "create"), "customers.write");
  assert.equal(resolveMoaPermission("students", "edit"), "customers.write");
  assert.equal(resolveMoaPermission("students", "delete"), "customers.write");

  // schedules / attendance (rooms로 잘못 매핑되지 않고 customers와 연동됨 확인)
  assert.equal(resolveMoaPermission("schedules", "list"), "customers.read");
  assert.equal(resolveMoaPermission("schedules", "create"), "customers.write");
  assert.equal(resolveMoaPermission("attendance", "list"), "customers.read");
  assert.notEqual(resolveMoaPermission("attendance", "list"), "rooms.read");
  assert.notEqual(resolveMoaPermission("schedules", "list"), "rooms.read");

  // billing / sales / finance
  assert.equal(resolveMoaPermission("sales", "list"), "sales.read");
  assert.equal(resolveMoaPermission("sales", "create"), "sales.create");
  assert.equal(resolveMoaPermission("sales", "refund"), "sales.refund");
  assert.equal(resolveMoaPermission("finance", "read"), "finance.read");
  assert.equal(resolveMoaPermission("tuition_invoices", "finance"), "finance.read");

  // staff / rooms / locations / reports
  assert.equal(resolveMoaPermission("staff", "list"), "staff.read");
  assert.equal(resolveMoaPermission("staff", "manage"), "staff.manage");
  assert.equal(resolveMoaPermission("rooms", "list"), "rooms.read");
  assert.equal(resolveMoaPermission("rooms", "manage"), "rooms.manage");
  assert.equal(resolveMoaPermission("locations", "list"), "locations.read");
  assert.equal(resolveMoaPermission("reports", "list"), "reports.read");

  // unknown resource / action -> Fail-Closed (null)
  assert.equal(resolveMoaPermission("unknown_res", "list"), null);
  assert.equal(resolveMoaPermission("students", "unknown_action"), null);
  assert.equal(resolveMoaPermission("secret", "delete"), null);

  // ---------------------------------------------------------------------------
  // 2. Public / Auth 리소스 허용
  // ---------------------------------------------------------------------------
  {
    const provider = createAccessControlProvider({
      getActiveUser: () => null,
      getOrganizationId: () => null,
      getLocationId: () => null,
    });
    assert.deepEqual(await provider.can({ resource: "auth", action: "login" }), { can: true });
    assert.deepEqual(await provider.can({ resource: "public", action: "read" }), { can: true });
  }

  // ---------------------------------------------------------------------------
  // 3. 비로그인 / 비인증 사용자 차단
  // ---------------------------------------------------------------------------
  {
    const provider = createAccessControlProvider({
      getActiveUser: () => null,
      getOrganizationId: () => ORG_A,
    });
    const res = await provider.can({ resource: "students", action: "list" });
    assert.equal(res.can, false);
    assert.equal(res.reason, "로그인이 필요합니다.");
  }

  // ---------------------------------------------------------------------------
  // 4. 소속 사업장(organization)이 없는 상태 차단
  // ---------------------------------------------------------------------------
  {
    const provider = createAccessControlProvider({
      getActiveUser: () => mockUser("owner"),
      getOrganizationId: () => null,
    });
    const res = await provider.can({ resource: "students", action: "list" });
    assert.equal(res.can, false);
    assert.equal(res.reason, "소속 사업장을 선택해 주세요.");
  }

  // ---------------------------------------------------------------------------
  // 5. 정상적인 Owner 및 Manager 접근 (Admin Roles)
  // ---------------------------------------------------------------------------
  {
    const ownerProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("owner"),
      getOrganizationId: () => ORG_A,
    });
    assert.equal((await ownerProvider.can({ resource: "students", action: "list" })).can, true);
    assert.equal((await ownerProvider.can({ resource: "staff", action: "manage" })).can, true);
    assert.equal((await ownerProvider.can({ resource: "finance", action: "read" })).can, true);
    assert.equal((await ownerProvider.can({ resource: "rooms", action: "manage" })).can, true);

    const managerProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("manager"),
      getOrganizationId: () => ORG_A,
    });
    assert.equal((await managerProvider.can({ resource: "students", action: "list" })).can, true);
    assert.equal((await managerProvider.can({ resource: "staff", action: "manage" })).can, true);
    assert.equal((await managerProvider.can({ resource: "finance", action: "read" })).can, true);
  }

  // ---------------------------------------------------------------------------
  // 6. 일반 Staff 접근 (기본 권한 허용 vs 관리 권한 차단)
  // ---------------------------------------------------------------------------
  {
    const staffProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("staff"),
      getOrganizationId: () => ORG_A,
    });
    // Staff 허용 기본 권한
    assert.equal((await staffProvider.can({ resource: "students", action: "list" })).can, true);
    assert.equal((await staffProvider.can({ resource: "students", action: "create" })).can, true);
    assert.equal((await staffProvider.can({ resource: "sales", action: "create" })).can, true);
    assert.equal((await staffProvider.can({ resource: "rooms", action: "list" })).can, true);

    // Staff 제외 관리 권한 차단
    assert.equal((await staffProvider.can({ resource: "staff", action: "manage" })).can, false);
    assert.equal((await staffProvider.can({ resource: "rooms", action: "manage" })).can, false);
    assert.equal((await staffProvider.can({ resource: "finance", action: "read" })).can, false);
  }

  // ---------------------------------------------------------------------------
  // 7. params 조작을 통한 권한 상승(Privilege Escalation) 차단
  // ---------------------------------------------------------------------------
  {
    const staffProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("staff"),
      getOrganizationId: () => ORG_A,
    });

    // 1) params.role='owner' 조작 시도 -> 실제 role(staff)로 판정되어 finance.read 차단
    const roleTamper = await staffProvider.can({
      resource: "finance",
      action: "read",
      params: { role: "owner" },
    });
    assert.equal(roleTamper.can, false, "params.role cannot escalate permissions to owner");

    // 2) params.organizationId='other-org' 조작 시도 -> 실제 org(ORG_A) 기준으로만 판정
    const orgTamper = await staffProvider.can({
      resource: "students",
      action: "list",
      params: { organizationId: ORG_B },
    });
    // staff는 ORG_A 소속이므로 ORG_A에 대해선 true이지만, ORG_B로의 탈취는 차단
    assert.equal(orgTamper.can, true); // 평가 컨텍스트는 여전히 ORG_A임

    // 3) params.extraGrants 조작 시도 -> params의 grants는 무시됨
    const grantTamper = await staffProvider.can({
      resource: "finance",
      action: "read",
      params: {
        extraGrants: [
          {
            organizationId: ORG_A,
            permission: "finance.read",
            scopeType: "organization",
            active: true,
          },
        ],
      },
    });
    assert.equal(grantTamper.can, false, "params.extraGrants cannot inject unverified permissions");
  }

  // ---------------------------------------------------------------------------
  // 8. Extra Grant를 통한 합법적 권한 부여
  // ---------------------------------------------------------------------------
  {
    const staffWithGrantsProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("staff"),
      getOrganizationId: () => ORG_A,
      listAccessGrants: async () => [
        {
          organizationId: ORG_A,
          permission: "finance.read",
          scopeType: "organization",
          active: true,
        },
      ],
    });

    // extraGrant로 finance.read가 부여된 staff는 허용
    assert.equal((await staffWithGrantsProvider.can({ resource: "finance", action: "read" })).can, true);
    // 여전히 rooms.manage는 없음
    assert.equal((await staffWithGrantsProvider.can({ resource: "rooms", action: "manage" })).can, false);
  }

  // ---------------------------------------------------------------------------
  // 9. Location Scope 검증
  // ---------------------------------------------------------------------------
  {
    const grants: AuthorizationGrant[] = [
      {
        organizationId: ORG_A,
        permission: "locations.read",
        scopeType: "location",
        scopeId: LOC_1,
        active: true,
      },
      {
        organizationId: ORG_A,
        permission: "rooms.read",
        scopeType: "location",
        scopeId: LOC_1,
        active: true,
      },
    ];

    const unknownRoleProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("unknown_role"),
      getOrganizationId: () => ORG_A,
      listAccessGrants: async () => grants,
    });

    // LOC_1에 대한 권한은 허용
    const loc1Res = await unknownRoleProvider.can({
      resource: "rooms",
      action: "list",
      params: { locationId: LOC_1 },
    });
    assert.equal(loc1Res.can, true, "access granted to assigned location LOC_1");

    // LOC_2에 대한 권한은 거부
    const loc2Res = await unknownRoleProvider.can({
      resource: "rooms",
      action: "list",
      params: { locationId: LOC_2 },
    });
    assert.equal(loc2Res.can, false, "access denied to unassigned location LOC_2");
  }

  // ---------------------------------------------------------------------------
  // 10. Customer Scope 검증
  // ---------------------------------------------------------------------------
  {
    const grants: AuthorizationGrant[] = [
      {
        organizationId: ORG_A,
        permission: "customers.read",
        scopeType: "customer",
        scopeId: CUST_1,
        active: true,
      },
    ];

    const customScopedProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("unknown_role"),
      getOrganizationId: () => ORG_A,
      listAccessGrants: async () => grants,
    });

    // CUST_1 허용
    const cust1 = await customScopedProvider.can({
      resource: "customers",
      action: "show",
      params: { customerId: CUST_1 },
    });
    assert.equal(cust1.can, true);

    // CUST_2 차단
    const cust2 = await customScopedProvider.can({
      resource: "customers",
      action: "show",
      params: { customerId: CUST_2 },
    });
    assert.equal(cust2.can, false);
  }

  // ---------------------------------------------------------------------------
  // 11. Resource Scope 검증
  // ---------------------------------------------------------------------------
  {
    const grants: AuthorizationGrant[] = [
      {
        organizationId: ORG_A,
        permission: "rooms.read",
        scopeType: "resource",
        scopeId: RES_1,
        active: true,
      },
    ];

    const resourceScopedProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("unknown_role"),
      getOrganizationId: () => ORG_A,
      listAccessGrants: async () => grants,
    });

    // RES_1 허용
    const res1 = await resourceScopedProvider.can({
      resource: "rooms",
      action: "show",
      params: { resourceId: RES_1 },
    });
    assert.equal(res1.can, true);

    // RES_2 차단
    const res2 = await resourceScopedProvider.can({
      resource: "rooms",
      action: "show",
      params: { resourceId: RES_2 },
    });
    assert.equal(res2.can, false);
  }

  // ---------------------------------------------------------------------------
  // 12. Fail-Closed: Unknown Resource & Action Deny
  // ---------------------------------------------------------------------------
  {
    const staffProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("staff"),
      getOrganizationId: () => ORG_A,
    });

    const unknownRes = await staffProvider.can({ resource: "secret_records", action: "list" });
    assert.equal(unknownRes.can, false);
    assert.match(unknownRes.reason || "", /권한이 정의되지 않았습니다/);

    const unknownAct = await staffProvider.can({ resource: "students", action: "drop_all_tables" });
    assert.equal(unknownAct.can, false);
    assert.match(unknownAct.reason || "", /권한이 정의되지 않았습니다/);

    // 미등록 params.permission → deny (유효하지 않은 권한 식별자)
    const invalidExplicitPerm = await staffProvider.can({
      resource: "students",
      action: "list",
      params: { permission: "illegal.bypass" },
    });
    assert.equal(invalidExplicitPerm.can, false);
    assert.match(invalidExplicitPerm.reason || "", /유효하지 않은 권한 식별자/);
  }

  // ---------------------------------------------------------------------------
  // 14. params.permission override 차단 (핵심 보안 검증)
  //
  // resource/action → canonical permission 매핑을 우회하는 모든 시도를 차단한다.
  // params.permission이 registry에 등록된 valid permission이더라도 허용하지 않는다.
  // ---------------------------------------------------------------------------
  {
    const staffProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("staff"),
      getOrganizationId: () => ORG_A,
    });

    // staff는 finance.read 권한이 없다.
    // params.permission으로 finance.read를 직접 지정해도 deny되어야 한다.
    const escalateViaValidPerm = await staffProvider.can({
      resource: "customers",
      action: "list",
      params: { permission: "finance.read" },
    });
    assert.equal(escalateViaValidPerm.can, false,
      "params.permission with valid registry permission must be denied (override path closed)");
    assert.match(
      escalateViaValidPerm.reason || "",
      /params\.permission.*허용되지 않습니다/,
    );

    // staff는 staff.manage 권한이 없다.
    // params.permission으로 staff.manage를 직접 지정해도 deny되어야 한다.
    const escalateToManage = await staffProvider.can({
      resource: "customers",
      action: "list",
      params: { permission: "staff.manage" },
    });
    assert.equal(escalateToManage.can, false,
      "params.permission staff.manage must be denied regardless of resource/action");
    assert.match(
      escalateToManage.reason || "",
      /params\.permission.*허용되지 않습니다/,
    );

    // owner도 params.permission override는 허용되지 않는다.
    const ownerOverride = createAccessControlProvider({
      getActiveUser: () => mockUser("owner"),
      getOrganizationId: () => ORG_A,
    });
    const ownerTryOverride = await ownerOverride.can({
      resource: "customers",
      action: "list",
      params: { permission: "staff.manage" },
    });
    assert.equal(ownerTryOverride.can, false,
      "even owner cannot supply params.permission to override resource/action mapping");
  }

  // ---------------------------------------------------------------------------
  // 13. Portal / Customer Context (학부모 및 고객 계정 차단)
  // ---------------------------------------------------------------------------
  {
    const customerProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("customer"),
      getOrganizationId: () => ORG_A,
    });
    // 고객 계정은 원생 목록, 매출, 스태프 관리 접근 불가
    assert.equal((await customerProvider.can({ resource: "students", action: "list" })).can, false);
    assert.equal((await customerProvider.can({ resource: "sales", action: "list" })).can, false);
    assert.equal((await customerProvider.can({ resource: "staff", action: "list" })).can, false);

    const parentProvider = createAccessControlProvider({
      getActiveUser: () => mockUser("parent"),
      getOrganizationId: () => ORG_A,
    });
    assert.equal((await parentProvider.can({ resource: "students", action: "list" })).can, false);
    assert.equal((await parentProvider.can({ resource: "finance", action: "read" })).can, false);
  }

  // ---------------------------------------------------------------------------
  // 15. Organization Context Authority & Dynamic Resolver Binding 검증
  // ---------------------------------------------------------------------------
  {
    const provider = createAccessControlProvider();

    // 1) Organization A 선택 시
    bindAccessControlContextResolver({
      getActiveUser: () => mockUser("owner"),
      getOrganizationId: () => ORG_A,
    });
    assert.equal((await provider.can({ resource: "students", action: "list" })).can, true);

    // 2) Organization B로 스위치 시 -> B authority로 즉시 반영
    bindAccessControlContextResolver({
      getActiveUser: () => mockUser("staff"), // B에서는 staff role
      getOrganizationId: () => ORG_B,
    });
    assert.equal((await provider.can({ resource: "finance", action: "read" })).can, false, "staff on Org B cannot read finance");

    // 3) Stale localStorage 방지: selectedMembership이 null (선택 해제)인 상태
    bindAccessControlContextResolver({
      getActiveUser: () => mockUser("owner"),
      getOrganizationId: () => null, // selectedMembership이 없으므로 null
    });
    const unselectedRes = await provider.can({ resource: "students", action: "list" });
    assert.equal(unselectedRes.can, false, "must be denied when active selected membership is null");
    assert.equal(unselectedRes.reason, "소속 사업장을 선택해 주세요.");

    // 바인딩 원복
    bindAccessControlContextResolver(null);
  }

  console.log("accessControlProvider.test.ts: all assertions passed");
}

void testAccessControl();
