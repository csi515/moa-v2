import type { CustomerId, LocalDateString, Money, TenantId } from './coreTypes';

/**
 * 전역 표준 결제 수단
 * Capability 간 크로스 import 없이 결제/수납을 주고받을 수 있는 공용 Canonical Enum
 */
export type CanonicalPaymentMethod =
  | 'card'
  | 'transfer'
  | 'cash'
  | 'other'
  | 'local_currency'
  | 'onsite_card';

/**
 * 전역 표준 상담 유형
 */
export type CanonicalConsultationType =
  | 'parent'
  | 'student'
  | 'career'
  | 'learning'
  | 'other';

/**
 * 전역 표준 회원/학생 상태
 */
export type CanonicalCustomerStatus = 'active' | 'leave' | 'withdrawn';

/**
 * Capability 간 참조를 위한 최소 고객 서머리 인터페이스
 */
export interface CanonicalCustomerSummary {
  id: CustomerId;
  name: string;
  status: CanonicalCustomerStatus;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  organizationId?: TenantId;
}

/**
 * 수납/청구 관련 서머리
 */
export interface CanonicalInvoiceSummary {
  id: string;
  customerId: CustomerId;
  title: string;
  billingMonth: string;
  totalAmount: Money;
  paidAmount: Money;
  unpaidAmount: Money;
  isPaid: boolean;
  dueDate?: LocalDateString;
}

export type CanonicalTextbookPaymentStatus = 'unpaid' | 'partial' | 'paid';

/**
 * 교재/상품 판매 항목 서머리 (TextbookSale과 구조적 100% 호환)
 */
export interface CanonicalTextbookSaleItem {
  id: string;
  studentId: string;
  studentName: string;
  parentId?: string;
  parentName: string;
  parentPhone: string;
  textbookId: string;
  textbookTitle: string;
  saleDate: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: CanonicalTextbookPaymentStatus;
  paymentMethod?: CanonicalPaymentMethod | null;
  memo?: string;
  teacherId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}
