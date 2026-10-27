/**
 * Moa-v2 Database Sandbox & RLS Policy Engine
 *
 * Supabase Postgres RLS(Row Level Security) 규칙과 DB 트랜잭션 무결성 불변조건을
 * 애플리케이션 UI 없이 코드 레벨에서 100% 원자적으로 시뮬레이션 및 검증하는 엔진입니다.
 */

export interface DbUserContext {
  userId: string;
  role: 'owner' | 'manager' | 'instructor' | 'staff' | 'customer' | 'parent' | 'anon';
  organizationId: string;
  email: string;
}

export interface CustomerRecord {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  status: string;
}

export interface PassRecord {
  id: string;
  organization_id: string;
  customer_id: string;
  pass_name: string;
  remaining_count: number;
  total_count: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'PAUSED';
}

export interface SalesRecord {
  id: string;
  organization_id: string;
  amount: number;
  item_name: string;
  customer_id: string;
}

export interface SettlementLedgerRecord {
  id: string;
  organization_id: string;
  period: string;
  gross_sales: number;
  net_payout: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID';
}

export interface SandboxDatabaseState {
  customers: CustomerRecord[];
  passes: PassRecord[];
  sales: SalesRecord[];
  settlement_ledgers: SettlementLedgerRecord[];
}

export class RlsDeniedError extends Error {
  readonly code = '42501';
  readonly status = 403;
  constructor(message: string) {
    super(`[RLS 42501 / 403 Forbidden] ${message}`);
    this.name = 'RlsDeniedError';
  }
}

export class FkConstraintError extends Error {
  readonly code = '23503';
  readonly status = 400;
  constructor(message: string) {
    super(`[FK 23503 Integrity Violation] ${message}`);
    this.name = 'FkConstraintError';
  }
}

/**
 * 샌드박스 RLS 클라이언트
 * 특정 사용자(JWT Context)의 관점에서 DB 테이블에 접근할 때
 * Postgres RLS 정책을 평가하여 차단하거나 필터링합니다.
 */
export class SandboxDbClient {
  constructor(
    private state: SandboxDatabaseState,
    private ctx: DbUserContext
  ) {}

  /**
   * 1. customers 테이블 SELECT RLS 검증
   * - Staff/Owner: 본인 조직(organization_id)의 고객만 조회 가능
   * - Customer: 본인 레코드만 조회 가능
   * - 다른 조직의 고객 조회 시도 시 0건 반환 (RLS 격리)
   */
  async selectCustomers(targetOrgId?: string): Promise<CustomerRecord[]> {
    if (this.ctx.role === 'anon') return [];

    return this.state.customers.filter((c) => {
      // 테넌트 격리 불변식: 다른 조직의 데이터는 볼 수 없음
      if (c.organization_id !== this.ctx.organizationId) return false;
      if (targetOrgId && c.organization_id !== targetOrgId) return false;

      // 역할별 가시성: 고객은 본인 고객 레코드만
      if (this.ctx.role === 'customer') {
        return c.id === this.ctx.userId;
      }
      return true; // staff/owner/manager 등
    });
  }

  /**
   * 2. sales (매출 장부) 테이블 SELECT RLS 검증
   * - Staff/Owner: 본인 조직 매출만 열람
   * - Customer: 타인/타 조직 매출 열람 불가 (0건)
   */
  async selectSales(targetOrgId?: string): Promise<SalesRecord[]> {
    if (this.ctx.role === 'anon' || this.ctx.role === 'customer') return [];

    return this.state.sales.filter((s) => {
      if (s.organization_id !== this.ctx.organizationId) return false;
      if (targetOrgId && s.organization_id !== targetOrgId) return false;
      return true;
    });
  }

  /**
   * 3. settlement_ledgers (민감 정산/재무 장부) CUD RLS 검증
   * - Owner / Admin만 접근 가능
   * - Staff, Instructor, Customer가 INSERT/UPDATE 시도 시 403 / 42501 RLS Denied 에러 발생
   */
  async insertSettlementLedger(ledger: Omit<SettlementLedgerRecord, 'id'>): Promise<SettlementLedgerRecord> {
    if (this.ctx.role !== 'owner') {
      throw new RlsDeniedError(
        `역할 '${this.ctx.role}'은(는) settlement_ledgers 테이블에 INSERT 권한이 없습니다. (사업주 전용)`
      );
    }
    if (ledger.organization_id !== this.ctx.organizationId) {
      throw new RlsDeniedError('타 사업장으로 정산 장부를 생성할 수 없습니다.');
    }

    const created: SettlementLedgerRecord = {
      id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...ledger,
    };
    this.state.settlement_ledgers.push(created);
    return created;
  }

  /**
   * 4. passes (이용권) INSERT RLS & FK 무결성 검증
   * - Customer는 본인 또는 타인의 이용권을 직접 생성할 수 없음 (403 RLS Denied)
   * - Staff/Owner는 본인 조직 고객에게만 발급 가능
   * - 복합 FK 불변식: customer_id가 대상 organization_id에 실존해야 함
   */
  async insertPass(pass: Omit<PassRecord, 'id'>): Promise<PassRecord> {
    if (this.ctx.role === 'customer' || this.ctx.role === 'anon') {
      throw new RlsDeniedError(
        `역할 '${this.ctx.role}'은(는) passes 테이블에 직접 INSERT할 수 없습니다. (결제/관리자 권한 필요)`
      );
    }
    if (pass.organization_id !== this.ctx.organizationId) {
      throw new RlsDeniedError('타 사업장 소속으로 이용권을 발급할 수 없습니다.');
    }

    // 복합 외래키 불변조건 검증
    const customer = this.state.customers.find(
      (c) => c.id === pass.customer_id && c.organization_id === pass.organization_id
    );
    if (!customer) {
      throw new FkConstraintError(
        `고객 ID '${pass.customer_id}'가 조직 '${pass.organization_id}'에 존재하지 않습니다.`
      );
    }

    const created: PassRecord = {
      id: `pass-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...pass,
    };
    this.state.passes.push(created);
    return created;
  }
}
