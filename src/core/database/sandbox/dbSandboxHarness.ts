/**
 * Moa-v2 Database Sandbox & Seed Harness
 *
 * 테스트 실행 직전 테스트 전용 샌드박스를 초기화하고 정해진 시드 데이터를 주입하며,
 * 테스트 완료 후 원자적으로 롤백(Rollback)하거나 드롭(Teardown)하는 격리 하네스입니다.
 */

import {
  SandboxDatabaseState,
  SandboxDbClient,
  DbUserContext,
} from './rlsPolicyEngine';

export interface SandboxSeedFixture {
  orgA: {
    id: string;
    name: string;
    owner: DbUserContext;
    staff: DbUserContext;
    customer: DbUserContext;
  };
  orgB: {
    id: string;
    name: string;
    owner: DbUserContext;
    staff: DbUserContext;
    customer: DbUserContext;
  };
}

export class DatabaseSandboxHarness {
  private state!: SandboxDatabaseState;
  private snapshotState!: string; // 롤백을 위한 스냅샷 직렬화
  readonly fixture: SandboxSeedFixture;

  constructor() {
    this.fixture = {
      orgA: {
        id: 'org-sandbox-a-1111',
        name: '모아 필라테스 강남점 (Org A)',
        owner: {
          userId: 'user-owner-a',
          role: 'owner',
          organizationId: 'org-sandbox-a-1111',
          email: 'owner.a@moa.ac',
        },
        staff: {
          userId: 'user-staff-a',
          role: 'staff',
          organizationId: 'org-sandbox-a-1111',
          email: 'staff.a@moa.ac',
        },
        customer: {
          userId: 'cust-member-a',
          role: 'customer',
          organizationId: 'org-sandbox-a-1111',
          email: 'customer.a@moa.ac',
        },
      },
      orgB: {
        id: 'org-sandbox-b-2222',
        name: '모아 아카데미 대치점 (Org B)',
        owner: {
          userId: 'user-owner-b',
          role: 'owner',
          organizationId: 'org-sandbox-b-2222',
          email: 'owner.b@moa.ac',
        },
        staff: {
          userId: 'user-staff-b',
          role: 'staff',
          organizationId: 'org-sandbox-b-2222',
          email: 'staff.b@moa.ac',
        },
        customer: {
          userId: 'cust-member-b',
          role: 'customer',
          organizationId: 'org-sandbox-b-2222',
          email: 'customer.b@moa.ac',
        },
      },
    };
    this.reset();
  }

  /**
   * 1. 샌드박스 초기화 및 표준 시드 데이터 주입
   */
  reset(): void {
    this.state = {
      customers: [
        {
          id: 'cust-member-a',
          organization_id: this.fixture.orgA.id,
          name: '김수강 (Org A)',
          phone: '010-1111-2222',
          status: 'active',
        },
        {
          id: 'cust-member-b',
          organization_id: this.fixture.orgB.id,
          name: '이원생 (Org B)',
          phone: '010-3333-4444',
          status: 'active',
        },
      ],
      passes: [
        {
          id: 'pass-a-001',
          organization_id: this.fixture.orgA.id,
          customer_id: 'cust-member-a',
          pass_name: '필라테스 10회권 (Org A)',
          remaining_count: 10,
          total_count: 10,
          status: 'ACTIVE',
        },
        {
          id: 'pass-b-001',
          organization_id: this.fixture.orgB.id,
          customer_id: 'cust-member-b',
          pass_name: '피아노 주 2회권 (Org B)',
          remaining_count: 8,
          total_count: 8,
          status: 'ACTIVE',
        },
      ],
      sales: [
        {
          id: 'sale-a-001',
          organization_id: this.fixture.orgA.id,
          amount: 300000,
          item_name: '10회 수강권',
          customer_id: 'cust-member-a',
        },
        {
          id: 'sale-b-001',
          organization_id: this.fixture.orgB.id,
          amount: 250000,
          item_name: '피아노 월 레슨비',
          customer_id: 'cust-member-b',
        },
      ],
      settlement_ledgers: [
        {
          id: 'ledger-a-001',
          organization_id: this.fixture.orgA.id,
          period: '2026-10',
          gross_sales: 15000000,
          net_payout: 13500000,
          status: 'CONFIRMED',
        },
        {
          id: 'ledger-b-001',
          organization_id: this.fixture.orgB.id,
          period: '2026-10',
          gross_sales: 9800000,
          net_payout: 8820000,
          status: 'CONFIRMED',
        },
      ],
    };

    // 스냅샷 저장 (롤백 기준점)
    this.takeSnapshot();
  }

  /**
   * 2. 트랜잭션 스냅샷 저장
   */
  takeSnapshot(): void {
    this.snapshotState = JSON.stringify(this.state);
  }

  /**
   * 3. 롤백 (Rollback): 스냅샷 시점으로 완벽 복구
   */
  rollback(): void {
    if (!this.snapshotState) {
      throw new Error('저장된 스냅샷이 없어 롤백할 수 없습니다.');
    }
    this.state = JSON.parse(this.snapshotState);
  }

  /**
   * 4. 특정 사용자의 권한을 가진 DB 클라이언트 획득
   */
  getClient(user: DbUserContext): SandboxDbClient {
    return new SandboxDbClient(this.state, user);
  }

  /**
   * 5. 상태 검증용 원본 데이터 열람 (단언 전용)
   */
  getRawState(): SandboxDatabaseState {
    return this.state;
  }
}
