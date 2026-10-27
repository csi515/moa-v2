/**
 * Moa-v2 데이터베이스 샌드박스 및 RLS/불변조건 테스트
 * (Database Sandbox & RLS Policy Invariant Tests)
 *
 * 1. 격리된 시드(Seed) 데이터 주입 및 원자적 롤백(Rollback) 증명
 * 2. 테넌트 간(Cross-Tenant) RLS 데이터 격리 (타 매장 조회 시 0건 반환)
 * 3. 직급별 RLS 권한 차단: Staff/Customer의 민감 장부 및 이용권 조작 시 403 차단
 * 4. 복합 외래키(Composite FK) 불변조건 무결성 검증
 */

import assert from 'node:assert/strict';
import { DatabaseSandboxHarness } from '../src/core/database/sandbox/dbSandboxHarness';
import { RlsDeniedError, FkConstraintError } from '../src/core/database/sandbox/rlsPolicyEngine';

async function runDbSandboxRlsSuite() {
  console.log('🧪 [DB Sandbox & RLS Invariants] 데이터베이스 샌드박스 및 RLS 단위 검증 시작...\n');

  const harness = new DatabaseSandboxHarness();
  const { orgA, orgB } = harness.fixture;

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 1: 격리된 시드 주입 및 테스트 완료 후 원자적 롤백(Rollback) 검증
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 1: 격리된 시드 주입 및 트랜잭션 롤백(Rollback/Teardown) 검증');
  {
    harness.reset();
    const initialState = harness.getRawState();
    assert.equal(initialState.customers.length, 2, '초기 시드 고객 수는 2명이어야 함');
    assert.equal(initialState.passes.length, 2, '초기 시드 이용권 수는 2건이어야 함');

    // 임의의 데이터 변경 (테스트 중 변형 발생)
    const ownerClient = harness.getClient(orgA.owner);
    await ownerClient.insertPass({
      organization_id: orgA.id,
      customer_id: 'cust-member-a',
      pass_name: '임시 테스트 패스',
      total_count: 5,
      remaining_count: 5,
      status: 'ACTIVE',
    });
    assert.equal(harness.getRawState().passes.length, 3, '임시 패스 등록 후 3건이어야 함');

    // 롤백 실행
    harness.rollback();
    const rolledBackState = harness.getRawState();
    assert.equal(rolledBackState.passes.length, 2, '롤백 후 정확히 초기 시드 상태(2건)로 복원되어야 함');
    assert.equal(
      rolledBackState.passes.some((p) => p.pass_name === '임시 테스트 패스'),
      false,
      '임시 생성된 데이터는 완전히 제거되어야 함'
    );
    console.log('  ✔ 통과: 원자적 스냅샷 롤백(Rollback)을 통한 부수효과 제로(Zero-Side-Effect) 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 2: 테넌트 간(Cross-Tenant) RLS 데이터 격리 검증 (SQL SELECT 0건 차단)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 2: 테넌트 간(Cross-Tenant) RLS 데이터 유출 원천 차단 (0건 반환)');
  {
    harness.reset();
    const staffAClient = harness.getClient(orgA.staff);

    // 2-1. OrgA 직원이 본인 매장(OrgA) 고객을 조회할 때 -> 1건 정상 반환
    const myCustomers = await staffAClient.selectCustomers();
    assert.equal(myCustomers.length, 1, '본인 조직 고객은 1건 정상 조회되어야 함');
    assert.equal(myCustomers[0].name, '김수강 (Org A)');

    // 2-2. OrgA 직원이 OrgB 매장의 고객을 조회할 때 -> RLS 필터링으로 0건 반환
    const foreignCustomers = await staffAClient.selectCustomers(orgB.id);
    assert.equal(foreignCustomers.length, 0, '타 조직(OrgB) 고객 조회 시 0건이어야 함 (RLS 격리)');

    // 2-3. OrgA 직원이 OrgB 매장의 매출 장부(sales)를 조회할 때 -> 0건 반환
    const foreignSales = await staffAClient.selectSales(orgB.id);
    assert.equal(foreignSales.length, 0, '타 조직(OrgB) 매출 장부 조회 시 0건이어야 함 (RLS 격리)');

    // 2-4. 일반 고객(Customer)이 타 고객 데이터를 조회할 때 -> 본인 외 0건 반환
    const customerAClient = harness.getClient(orgA.customer);
    const customerView = await customerAClient.selectCustomers();
    assert.equal(customerView.length, 1, '고객은 오직 본인 레코드만 조회 가능해야 함');
    assert.equal(customerView[0].id, orgA.customer.userId);

    console.log('  ✔ 통과: 타 테넌트 고객/매출 조회 시 SQL 레벨 0건 필터링 격리 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 3: 직급/역할별(RBAC) 민감 테이블 RLS 권한 차단 검증 (403 Forbidden)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 3: 직급별 민감 테이블 조작 시 DB RLS 403 (Permission Denied) 차단');
  {
    harness.reset();
    const staffAClient = harness.getClient(orgA.staff);
    const customerAClient = harness.getClient(orgA.customer);
    const ownerAClient = harness.getClient(orgA.owner);

    // 3-1. 직원이 민감 재무 정산 장부(settlement_ledgers)에 직접 INSERT 시도 시 403 차단
    let staffLedgerError: any = null;
    try {
      await staffAClient.insertSettlementLedger({
        organization_id: orgA.id,
        period: '2026-11',
        gross_sales: 10000000,
        net_payout: 9000000,
        status: 'DRAFT',
      });
    } catch (err) {
      staffLedgerError = err;
    }
    assert.ok(staffLedgerError instanceof RlsDeniedError, '직원의 정산 장부 INSERT는 RlsDeniedError여야 함');
    assert.equal(staffLedgerError.status, 403, 'HTTP 403 코드로 거부되어야 함');
    assert.equal(staffLedgerError.code, '42501', 'Postgres 42501 RLS 위반 에러코드여야 함');

    // 3-2. 일반 고객이 passes 테이블에 직접 이용권을 발급(INSERT) 시도 시 403 차단
    let customerPassError: any = null;
    try {
      await customerAClient.insertPass({
        organization_id: orgA.id,
        customer_id: 'cust-member-a',
        pass_name: '무단 발급 100회권',
        total_count: 100,
        remaining_count: 100,
        status: 'ACTIVE',
      });
    } catch (err) {
      customerPassError = err;
    }
    assert.ok(customerPassError instanceof RlsDeniedError, '고객의 이용권 직접 INSERT는 RlsDeniedError여야 함');
    assert.equal(customerPassError.status, 403, 'HTTP 403 코드로 거부되어야 함');

    // 3-3. 정당한 권한을 가진 사업주(Owner)는 본인 사업장 정산 장부 INSERT 정상 허용
    const createdLedger = await ownerAClient.insertSettlementLedger({
      organization_id: orgA.id,
      period: '2026-11',
      gross_sales: 20000000,
      net_payout: 18000000,
      status: 'DRAFT',
    });
    assert.ok(createdLedger.id, '사업주의 정산 장부 생성은 정상 처리되어 ID가 발급되어야 함');

    console.log('  ✔ 통과: Staff 및 Customer의 민감 테이블 CUD 시 DB 403(42501) 차단 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 4: 복합 외래키(Composite FK) 및 불변조건 무결성 검증
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 4: 복합 외래키(Composite FK) 및 데이터 무결성 불변조건 검증');
  {
    harness.reset();
    const staffAClient = harness.getClient(orgA.staff);

    // 4-1. OrgA 직원이 OrgB 소속 고객 ID('cust-member-b')로 이용권을 발급하려 할 때
    // composite FK (customer_id, organization_id) 불일치로 23503 Integrity Violation 발생
    let fkError: any = null;
    try {
      await staffAClient.insertPass({
        organization_id: orgA.id,
        customer_id: 'cust-member-b', // OrgB 소속 고객
        pass_name: '교차 발급 시도 패스',
        total_count: 10,
        remaining_count: 10,
        status: 'ACTIVE',
      });
    } catch (err) {
      fkError = err;
    }
    assert.ok(fkError instanceof FkConstraintError, '교차 조직 고객 지정 시 FkConstraintError여야 함');
    assert.equal(fkError.code, '23503', 'Postgres 23503 FK 무결성 위반 코드여야 함');

    console.log('  ✔ 통과: 타 테넌트 고객 지정 차단 및 복합 FK 무결성 불변조건 검증 완료\n');
  }

  console.log('✨ [DB Sandbox & RLS Invariants] 4대 핵심 영역 DB 샌드박스 및 RLS 불변조건 테스트 100% 통과!\n');
}

runDbSandboxRlsSuite().catch((err) => {
  console.error('❌ DB Sandbox & RLS Invariants 테스트 실패:', err);
  process.exit(1);
});
