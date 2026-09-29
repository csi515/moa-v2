import type { PaymentMethod } from '@/capabilities/billing/finance/paymentMethod';

export interface Textbook {
  id: string;
  title: string;
  publisher: string;
  author?: string;
  isbn?: string;
  level: string;
  price: number;
  salePrice: number;
  costPrice: number;
  /**
   * 현재 재고 미러.
   * 실제 source of truth는 Core Inventory(productId).
   * Core 연동 후 재고 변경은 Core 반영 뒤 이 필드를 동기화한다.
   */
  stock: number;
  currentStock?: number;
  minStock: number;
  isForSale: boolean;
  memo?: string;
  /** Core products.id — 재고 연동 키. 없으면 이관 시 textbook.id로 생성 */
  productId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type TextbookPaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface TextbookSale {
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
  status: TextbookPaymentStatus;
  paymentMethod?: PaymentMethod | null;
  memo?: string;
  teacherId?: string;
  teacherName?: string;
  createdAt?: string;
  updatedAt?: string;
  /** 월 청구서에 합산된 경우 해당 청구서 id — 별도 미납/중복 집계 제외 */
  billingInvoiceId?: string;
  /**
   * Core sales.id 연결.
   * 신규 Core 연동 판매는 보통 id === coreSaleId.
   * NULL이면 legacy TextbookSale(재고만 Core 또는 로컬) — 삭제하지 않고 read fallback.
   * Core SaleStatus(completed 등)와 TextbookPaymentStatus(unpaid/partial/paid)는 별개.
   */
  coreSaleId?: string | null;
}

export interface TextbookPayment {
  id: string;
  textbookSaleId: string;
  studentId?: string;
  studentName?: string;
  textbookTitle?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  memo?: string;
  receiptNumber?: string;
  createdAt?: string;
}

export type InventoryTransactionType = 'inbound' | 'sale' | 'return' | 'adjust';

export interface TextbookInventoryTransaction {
  id: string;
  textbookId: string;
  textbookTitle: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  previousStock: number;
  currentStock: number;
  referenceId?: string;
  transactionDate: string;
  memo?: string;
  createdAt?: string;
}
