import type { TextbookSale, TextbookPaymentStatus } from '@/capabilities/commerce/textbookTypes';
import type { PaymentMethod } from './paymentMethod';

export type { PaymentMethod } from './paymentMethod';

export type TeacherPayType = 'hourly' | 'attendance' | 'work_hours' | 'monthly' | 'none';

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'cancelled';

export interface InvoiceExtraItem {
  id: string;
  label: string;
  amount: number;
  sourceType: 'recital' | 'manual';
}

export interface TuitionInvoice {
  id: string;
  studentId: string;
  studentName: string;
  yearMonth: string;
  /** 청구서 제목 (예: 2026년 3월 피아노 수강료) */
  title?: string;
  baseTuition?: number;
  baseFee?: number;
  discount?: number;
  discountAmount?: number;
  textbookFee?: number;
  additionalAmount?: number;
  /** 연주회·콩쿠르 등 기타 합산 금액 */
  extraFee?: number;
  extraFeeLabel?: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  /** legacy compatibility snapshot. 수납 시 갱신하지 않음. 표시는 TuitionPayment */
  paymentMethod?: PaymentMethod | null;
  /** legacy compatibility snapshot. 수납 시 갱신하지 않음. 표시는 TuitionPayment */
  paidAt?: string;
  /** legacy compatibility snapshot. 수납 시 갱신하지 않음. 표시는 TuitionPayment */
  paidDate?: string;
  notes?: string;
  receiptNumber?: string;
  /** 월 청구에 교재·연주회비 합산 여부 (미설정 시 학원 설정) */
  includeExtras?: boolean;
  /** 합산된 교재 판매 id */
  linkedTextbookSaleIds?: string[];
  /** 합산된 연주회·기타 항목 */
  linkedExtraItems?: InvoiceExtraItem[];
  /**
   * 수동 발송 여부. false = 초안(학부모 미노출), true = 발송됨.
   * undefined = 레거시(발송된 것으로 간주).
   */
  invoiceSent?: boolean;
  /** 원장이 청구서를 수동 발송한 시각 */
  sentAt?: string | null;
  /** 학부모 현금영수증 발행 요청 */
  cashReceiptRequested?: boolean;
}

export interface TuitionPayment {
  id: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  yearMonth: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  memo?: string;
  receiptNumber?: string;
  cashReceiptIssued?: boolean;
  createdAt?: string;
}

export interface StudentMonthlyBillingSummary {
  studentId: string;
  studentName: string;
  yearMonth: string;
  tuitionBilled: number;
  tuitionPaid: number;
  tuitionUnpaid: number;
  tuitionStatus: InvoiceStatus;
  tuitionTotal?: number;
  textbookBilled: number;
  textbookPaid: number;
  textbookUnpaid: number;
  textbookStatus: TextbookPaymentStatus;
  textbookTotal?: number;
  totalBilled: number;
  totalPaid: number;
  totalUnpaid: number;
  grandTotal?: number;
  grandPaid?: number;
  grandUnpaid?: number;
  invoices?: TuitionInvoice[];
  textbookSales?: TextbookSale[];
}

export interface CombinedPaymentRequest {
  studentId: string;
  yearMonth: string;
  /** @deprecated tuitionPayments 사용 권장 */
  tuitionAmount?: number;
  tuitionPayments?: { invoiceId: string; amount: number }[];
  textbookPayments: { saleId: string; amount: number }[];
  paymentMethod: PaymentMethod;
  paymentDate: string;
  memo?: string;
  commandKey?: string;
}

export interface UnpaidInvoiceItem extends TuitionInvoice {
  daysOverdue: number;
}

export interface StudentUnpaidSummary {
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  tuitionUnpaid: number;
  textbookUnpaid: number;
  totalUnpaid: number;
  overdueCount: number;
  oldestOverdueDays: number;
  tuitionItems: UnpaidInvoiceItem[];
  textbookItems: (TextbookSale & { daysOverdue: number })[];
}

export type ExpenseCategory =
  | 'rent'
  | 'utility'
  | 'maintenance'
  | 'electricity'
  | 'water'
  | 'textbook'
  | 'supplies'
  | 'snacks'
  | 'marketing'
  | 'teacher_salary'
  | 'salary'
  | 'instructor_fee'
  | 'piano_tuning'
  | 'tuning'
  | 'other';

export interface ExpenseItem {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  recipient?: string;
  vendor?: string;
  memo?: string;
  receiptMemo?: string;
  teacherId?: string;
  settlementYearMonth?: string;
  settlementKind?: 'teacher_payroll';
  settlementPayType?: TeacherPayType;
  settlementQuantity?: number;
  settlementRate?: number;
  settlementCalculatedAmount?: number;
  settlementAdjustmentAmount?: number;
  settlementAdjustmentReason?: string;
}
export type Expense = ExpenseItem;
