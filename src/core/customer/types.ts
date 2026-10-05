/**
 * Core Customer Domain Type.
 *
 * 모든 업종(학원 원생, 피트니스 회원, 뷰티/클리닉 고객, 어린이집 원아, 리테일 손님 등)의
 * 기초가 되는 단일 출처(SoT) 고객 엔티티입니다.
 *
 * Supabase `core.customers` 테이블과 직접 대응되며,
 * 업종별 특수 필드(학교, 학년, 신발사이즈, 알레르기 등)는 `metadata` JSONB를 통해 수용합니다.
 */

export type CustomerStatus = 'active' | 'leave' | 'withdrawn' | 'inactive';

export interface CustomerContact {
  id?: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface Customer {
  id: string;
  organizationId?: string;
  name: string;
  phone?: string;
  email?: string;
  status: CustomerStatus;
  memo?: string;
  metadata?: Record<string, unknown>;
  contacts?: CustomerContact[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 범용 고객 객체 생성 헬퍼
 */
export function createCustomerDraft(overrides?: Partial<Customer>): Customer {
  const now = new Date().toISOString();
  return {
    id: overrides?.id || '',
    name: overrides?.name || '',
    status: overrides?.status || 'active',
    metadata: overrides?.metadata || {},
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
    ...overrides,
  };
}
