import type { TuitionInvoice, TuitionPayment } from '../../types';
import type { IncomeEntry } from '../../core/finance/types';
import { STORAGE_KEYS } from '../adapters';
import { setItem, type StorageApi } from './helpers';
import {
  backfillLinkedIncomeFromPayments,
  deleteLinkedIncome,
  getTuitionPayments as readTuitionPayments,
  saveTuitionPaymentDirect,
  upsertLinkedIncome,
} from '../../core/finance/billingIncomeLink';

/**
 * 수강료 invoice·payment·income 저장.
 * 금액 계산·월회비 판정은 invoicePaymentService.
 */
export function createFinanceInvoicePersist(api: StorageApi) {
  return {
    deleteInvoiceRecord(id: string): boolean {
      const list = (api.getInvoices as () => TuitionInvoice[])();
      const filtered = list.filter((invoice) => invoice.id !== id);
      if (filtered.length === list.length) return false;
      setItem(STORAGE_KEYS.INVOICES, filtered);
      return true;
    },

    saveTuitionPayment: saveTuitionPaymentDirect,

    removeTuitionPayment(paymentId: string): boolean {
      const payments = readTuitionPayments();
      const next = payments.filter((payment) => payment.id !== paymentId);
      if (next.length === payments.length) return false;
      setItem(STORAGE_KEYS.TUITION_PAYMENTS, next);
      return true;
    },

    removeTuitionPaymentsByInvoiceId(invoiceId: string): TuitionPayment[] {
      const payments = readTuitionPayments();
      const removed = payments.filter((payment) => payment.invoiceId === invoiceId);
      if (removed.length === 0) return [];
      setItem(
        STORAGE_KEYS.TUITION_PAYMENTS,
        payments.filter((payment) => payment.invoiceId !== invoiceId)
      );
      return removed;
    },

    deleteIncomeEntryRecord(id: string): boolean {
      const list = (api.getIncomeEntries as () => IncomeEntry[])();
      const filtered = list.filter((entry) => entry.id !== id);
      if (filtered.length === list.length) return false;
      setItem(STORAGE_KEYS.INCOME_ENTRIES, filtered);
      return true;
    },

    upsertLinkedIncome,
    deleteLinkedIncome,
    backfillBillingLinkedIncome: backfillLinkedIncomeFromPayments,
  };
}

export type FinanceInvoicePersistApi = ReturnType<typeof createFinanceInvoicePersist>;
