import { getCoreClient } from '@/lib/supabase';

export type CustomerLinkStatus = 'linked' | 'already_linked';

export interface CustomerLinkResult {
  status: CustomerLinkStatus;
  customerId: string;
  organizationId: string;
  userId?: string;
}

export interface EnsureGuestCustomerParams {
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  /** walk_in | phone_booking | reservation | retail_sale 등 */
  source?: string;
}

/** Core Customer 검색/표시용 최소 행 (User 연동 없음) */
export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string | null;
}

/** Core Customer 상세 표시용 — 기존 customers 컬럼만 (스키마 변경 없음) */
export interface CustomerProfile extends CustomerSearchResult {
  email: string | null;
  status: string;
  createdAt: string;
  /** User 연동 여부 (user_id 존재) */
  isLinked: boolean;
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Customer ↔ User 분리.
 * - 비회원 Customer: user_id NULL (전화 예약·원 등록·소매 판매)
 * - 회원 연동: linkCustomerToCurrentUser (명시 호출 시에만)
 * - 전화번호 일치만으로 User를 자동 연결하지 않음
 */
export const customerLinkService = {
  /**
   * 조직 내 Core Customer 검색 (이름·전화).
   * core.customers 만 조회 — Retail 전용 테이블 없음.
   */
  async searchCustomers(
    organizationId: string,
    query: string,
    limit = 20
  ): Promise<CustomerSearchResult[]> {
    const client = getCoreClient();
    const q = query.trim();
    let builder = client
      .from('customers')
      .select('id, name, phone')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .limit(limit);

    if (q) {
      const safe = escapeIlike(q);
      builder = builder.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    }

    const { data, error } = await builder;
    if (error) throw error;
    return ((data as CustomerSearchResult[] | null) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
    }));
  },

  async getCustomerById(
    organizationId: string,
    customerId: string
  ): Promise<CustomerSearchResult | null> {
    const profile = await this.getCustomerProfile(organizationId, customerId);
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
    };
  },

  /**
   * Core Customer 상세 조회 (organization_id 필수).
   * 기존 customers 행만 반환 — 테이블/스키마 변경 없음.
   */
  async getCustomerProfile(
    organizationId: string,
    customerId: string
  ): Promise<CustomerProfile | null> {
    const { data, error } = await getCoreClient()
      .from('customers')
      .select('id, name, phone, email, status, created_at, user_id')
      .eq('organization_id', organizationId)
      .eq('id', customerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      status: string | null;
      created_at: string;
      user_id: string | null;
    };
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      status: (row.status || 'active').trim() || 'active',
      createdAt: row.created_at,
      isLinked: Boolean(row.user_id),
    };
  },

  /**
   * 사업장 고객 목록 (이름순).
   * organization_id 필수 — 타 사업장 고객이 섞이지 않음.
   */
  async listCustomers(
    organizationId: string,
    limit = 200
  ): Promise<CustomerSearchResult[]> {
    const client = getCoreClient();
    const { data, error } = await client
      .from('customers')
      .select('id, name, phone')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .limit(Math.min(Math.max(1, limit), 500));
    if (error) throw error;
    return ((data as CustomerSearchResult[] | null) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
    }));
  },

  /** 스태프용 — 앱 없이 등록된 비회원 Customer 확보 (user_id NULL) */
  async ensureGuestCustomer(params: EnsureGuestCustomerParams): Promise<string> {
    const { data, error } = await getCoreClient().rpc('ensure_guest_customer' as never, {
      p_org_id: params.organizationId,
      p_name: params.name,
      p_phone: params.phone ?? null,
      p_email: params.email ?? null,
      p_source: params.source ?? 'walk_in',
    } as never);

    if (error) {
      if (error.message.includes('Not allowed')) {
        throw new Error('비회원 고객을 등록할 권한이 없습니다.');
      }
      if (error.message.includes('name is required')) {
        throw new Error('고객 이름을 입력해 주세요.');
      }
      throw new Error(error.message || '비회원 고객 등록에 실패했습니다.');
    }

    return data as string;
  },

  /**
   * 비회원 Customer를 현재 로그인 User에 연결.
   * 전화 확인(p_expected_phone)으로 가로채기를 막는다.
   * 판매 화면에서는 호출하지 않는다.
   */
  async linkCustomerToCurrentUser(
    customerId: string,
    expectedPhone?: string | null
  ): Promise<CustomerLinkResult> {
    const { data, error } = await getCoreClient().rpc('link_customer_to_current_user' as never, {
      p_customer_id: customerId,
      p_expected_phone: expectedPhone ?? null,
    } as never);

    if (error) {
      if (error.message.includes('already linked to another user')) {
        throw new Error('이미 다른 계정에 연결된 고객입니다.');
      }
      if (error.message.includes('Phone does not match')) {
        throw new Error('전화번호가 고객 기록과 일치하지 않습니다.');
      }
      if (error.message.includes('already linked to another customer')) {
        throw new Error('이 계정은 이미 이 사업장의 다른 고객과 연결되어 있습니다.');
      }
      throw new Error(error.message || '고객 계정 연결에 실패했습니다.');
    }

    const row = (typeof data === 'string' ? JSON.parse(data) : data) as {
      status: CustomerLinkStatus;
      customer_id: string;
      organization_id: string;
      user_id?: string;
    };

    return {
      status: row.status,
      customerId: row.customer_id,
      organizationId: row.organization_id,
      userId: row.user_id,
    };
  },

  /** 조직에서 내 user_id로 연결된 Customer (없으면 null) */
  async findMyLinkedCustomer(organizationId: string): Promise<{ id: string; name: string } | null> {
    const client = getCoreClient();
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) return null;

    const { data, error } = await client
      .from('customers')
      .select('id, name, user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { id: data.id, name: data.name };
  },
};
