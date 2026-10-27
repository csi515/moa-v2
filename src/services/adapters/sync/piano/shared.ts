import type { TextbookSale } from '../../../../types';
import type { PaymentMethod as DbPaymentMethod, PianoTextbookPaymentStatus } from '../../../../lib/supabase/database.types';

export interface SaleMetadata {
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  textbookTitle?: string;
  studentName?: string;
  teacherName?: string;
  billingInvoiceId?: string;
  /** Core sales.id — 컬럼 core_sale_id 와 동기 */
  coreSaleId?: string | null;
}

export const SALE_STATUS_TO_DB: Record<TextbookSale['status'], PianoTextbookPaymentStatus> = {
  unpaid: 'unpaid',
  partial: 'partial',
  paid: 'paid',
};

export const DB_TO_SALE_STATUS: Record<PianoTextbookPaymentStatus, TextbookSale['status']> = {
  unpaid: 'unpaid',
  partial: 'partial',
  paid: 'paid',
};

export const APP_TO_DB_PAYMENT: Record<string, DbPaymentMethod> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  online: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};

export const DB_TO_APP_PAYMENT: Record<string, string> = {
  card: 'card',
  transfer: 'transfer',
  cash: 'cash',
  other: 'other',
  online: 'other',
  local_currency: 'local_currency',
  onsite_card: 'onsite_card',
};
