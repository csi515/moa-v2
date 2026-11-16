export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'cancelled';
export type PaymentMethod =
  | 'card'
  | 'transfer'
  | 'cash'
  | 'bank_transfer'
  | 'auto_transfer'
  | 'local_currency'
  | 'onsite_card'
  | 'other';

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
  title?: string;
  baseTuition?: number;
  baseFee?: number;
  discount?: number;
  discountAmount?: number;
  textbookFee?: number;
  additionalAmount?: number;
  extraFee?: number;
  extraFeeLabel?: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod | null;
  paidAt?: string;
  paidDate?: string;
  notes?: string;
  receiptNumber?: string;
  includeExtras?: boolean;
  linkedTextbookSaleIds?: string[];
  linkedExtraItems?: InvoiceExtraItem[];
  extraItems?: InvoiceExtraItem[];
  invoiceSent?: boolean;
  sentAt?: string | null;
  cashReceiptRequested?: boolean;
  studentLevel?: string;
  organizationId?: string;
}
