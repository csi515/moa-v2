import type {
  AcademyEvent,
  AcademySettings,
  PaymentMethod,
  Student,
  TextbookSale,
  TuitionInvoice,
  TuitionPayment,
} from '@/types';
import type { StorageApi } from '@/services/storage/helpers';
import { isMonthlyBillingStudent } from '@/core/academy/utils/billingMode';
import { todayIsoLocal, yearMonthLocal } from '@/shared/utils/localDate';
import {
  buildInvoiceNotes,
  collectPendingRecitalFees,
  collectPendingTextbookSales,
  computeInvoiceTotal,
  resolveIncludeExtras,
} from '@/core/academy/utils/invoiceExtras';
import { defaultDueDateForMonth } from '@/core/academy/components/tuition/tuitionUtils';
import { listMonthlyTuitionMissingInvoices } from '@/capabilities/billing/finance/monthlyTuitionEnsure';
import { findMonthlyTuitionInvoice } from '@/capabilities/billing/finance/monthlyTuitionStatus';
import type { IncomeEntry } from '@/capabilities/billing/finance/types';

type LinkedIncomeSource = 'tuition' | 'textbook' | 'booking' | 'retail';

type InvoicePaymentStore = {
  getInvoices: () => TuitionInvoice[];
  saveInvoice: (inv: Omit<TuitionInvoice, 'id'> & { id?: string }) => TuitionInvoice;
  deleteInvoiceRecord: (id: string) => boolean;
  getTuitionPayments: () => TuitionPayment[];
  getTuitionPaymentsByInvoiceId: (invoiceId: string) => TuitionPayment[];
  saveTuitionPayment: (
    data: Omit<TuitionPayment, 'id' | 'createdAt' | 'receiptNumber'> & { receiptNumber?: string }
  ) => TuitionPayment;
  removeTuitionPayment: (paymentId: string) => boolean;
  removeTuitionPaymentsByInvoiceId: (invoiceId: string) => TuitionPayment[];
  getIncomeEntries: () => IncomeEntry[];
  deleteIncomeEntryRecord: (id: string) => boolean;
  upsertLinkedIncome: (params: {
    sourceType: LinkedIncomeSource;
    paymentId: string;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description: string;
    payer: string;
    memo?: string;
  }) => IncomeEntry;
  deleteLinkedIncome: (sourceType: LinkedIncomeSource, paymentId: string) => boolean;
  backfillBillingLinkedIncome: () => { tuitionCreated: number; textbookCreated: number };
  getSettings: () => AcademySettings;
  getTextbookSales: () => TextbookSale[];
  getEvents?: () => AcademyEvent[];
  getStudents: () => Student[];
  setTextbookBillingInvoice: (saleIds: string[], invoiceId: string | undefined) => void;
  clearTextbookBillingInvoiceForInvoice: (invoiceId: string) => void;
  createInvoiceForStudent: (
    student: Student,
    yearMonth?: string
  ) => TuitionInvoice | null;
  reverseTuitionPayment: (paymentId: string) => boolean;
  reverseTextbookPayment: (id: string) => boolean | Promise<boolean>;
  reverseLinkedTextbookPaymentsForTuition?: (paymentId: string) => void | Promise<void>;
};

function storeOf(api: StorageApi): InvoicePaymentStore {
  return api as InvoicePaymentStore;
}

/**
 * 수강료 납부·청구·수입 연동 orchestration.
 * persistence는 finance/textbook Storage API만 사용한다.
 */
export function createInvoicePaymentService(api: StorageApi) {
  const store = storeOf(api);

  return {
    deleteInvoice(id: string): boolean {
      const target = store.getInvoices().find((invoice) => invoice.id === id);
      if (!target) return false;

      const payments = store.getTuitionPaymentsByInvoiceId(id);
      for (const payment of payments) {
        store.deleteLinkedIncome('tuition', payment.id);
      }
      store.removeTuitionPaymentsByInvoiceId(id);
      store.deleteInvoiceRecord(id);
      store.clearTextbookBillingInvoiceForInvoice(id);
      return true;
    },

    recordPayment(
      invoiceId: string,
      amount: number,
      method: PaymentMethod,
      notes?: string,
      paymentDate?: string,
      options?: { cashReceiptIssued?: boolean }
    ): TuitionInvoice | null {
      const list = store.getInvoices();
      const inv = list.find((invoice) => invoice.id === invoiceId);
      if (!inv) return null;

      const payAmount = Math.min(amount, Math.max(0, inv.unpaidAmount));
      if (payAmount <= 0) return inv;

      const newPaidAmount = inv.paidAmount + payAmount;
      const newUnpaidAmount = Math.max(0, inv.totalAmount - newPaidAmount);
      const newStatus = newUnpaidAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';
      const pDate = paymentDate || todayIsoLocal();
      const receiptNum = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;

      const updated: TuitionInvoice = {
        ...inv,
        paidAmount: newPaidAmount,
        unpaidAmount: newUnpaidAmount,
        status: newStatus,
        notes: notes ? `${inv.notes || ''} [${pDate}] ${notes}`.trim() : inv.notes,
        receiptNumber: inv.receiptNumber || receiptNum,
      };

      store.saveInvoice(updated);

      const payment = store.saveTuitionPayment({
        invoiceId: inv.id,
        studentId: inv.studentId,
        studentName: inv.studentName,
        yearMonth: inv.yearMonth,
        paymentDate: pDate,
        amount: payAmount,
        paymentMethod: method,
        memo: notes,
        receiptNumber: receiptNum,
        cashReceiptIssued: options?.cashReceiptIssued === true,
      });

      store.upsertLinkedIncome({
        sourceType: 'tuition',
        paymentId: payment.id,
        date: pDate,
        amount: payAmount,
        paymentMethod: method,
        description: `${inv.yearMonth} 수강료 · ${inv.studentName}`,
        payer: inv.studentName,
        memo: notes,
      });

      if (updated.status === 'paid' && (inv.linkedTextbookSaleIds || []).length > 0) {
        void import('@/capabilities/billing/finance/linkedTextbookSettle')
          .then(({ settleLinkedTextbookSalesOnTuitionPaid }) =>
            settleLinkedTextbookSalesOnTuitionPaid({
              api,
              invoice: inv,
              paymentId: payment.id,
              method,
              paymentDate: pDate,
            })
          )
          .catch((err) => console.error('[recordPayment] linked textbook settle', err));
      }

      return updated;
    },

    reverseTuitionPayment(paymentId: string): boolean {
      const payment = store.getTuitionPayments().find((row) => row.id === paymentId);
      if (!payment) return false;

      const inv = store.getInvoices().find((invoice) => invoice.id === payment.invoiceId);
      if (inv) {
        const newPaid = Math.max(0, inv.paidAmount - payment.amount);
        const newUnpaid = Math.max(0, inv.totalAmount - newPaid);
        store.saveInvoice({
          ...inv,
          paidAmount: newPaid,
          unpaidAmount: newUnpaid,
          status: newUnpaid === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid',
        });
      }

      if (store.reverseLinkedTextbookPaymentsForTuition) {
        void Promise.resolve(store.reverseLinkedTextbookPaymentsForTuition(paymentId)).catch((err) =>
          console.error('[reversePayment] linked textbook reverse', err)
        );
      } else {
        void import('@/capabilities/billing/finance/linkedTextbookSettle')
          .then(({ reverseLinkedTextbookPaymentsForTuition }) =>
            reverseLinkedTextbookPaymentsForTuition(api, paymentId)
          )
          .catch((err) => console.error('[reversePayment] linked textbook reverse', err));
      }

      store.removeTuitionPayment(paymentId);
      store.deleteLinkedIncome('tuition', paymentId);
      return true;
    },

    createInvoiceForStudent(
      student: Student,
      yearMonth?: string,
      options?: { includeExtras?: boolean; extraFee?: number; extraFeeLabel?: string }
    ): TuitionInvoice | null {
      if (!isMonthlyBillingStudent(student)) {
        return null;
      }
      const ym = yearMonth || yearMonthLocal();

      const existing = findMonthlyTuitionInvoice(store.getInvoices(), student.id, ym);
      if (existing) return existing;

      const dueDate = defaultDueDateForMonth(ym, student.paymentDay || 10);
      const settings = store.getSettings();
      const includeExtras = resolveIncludeExtras(settings, options?.includeExtras);

      let textbookFee = 0;
      let linkedTextbookSaleIds: string[] = [];
      let linkedExtraItems: TuitionInvoice['linkedExtraItems'] = [];
      let extraFee = Math.max(0, Number(options?.extraFee) || 0);
      let extraFeeLabel = options?.extraFeeLabel;

      if (includeExtras) {
        const pendingSales = collectPendingTextbookSales(store.getTextbookSales(), student.id);
        textbookFee = pendingSales.reduce((sum, sale) => sum + sale.unpaidAmount, 0);
        linkedTextbookSaleIds = pendingSales.map((sale) => sale.id);

        const recitalItems = collectPendingRecitalFees({
          events: store.getEvents ? store.getEvents() : [],
          studentId: student.id,
          yearMonth: ym,
          existingInvoices: store.getInvoices(),
        });
        linkedExtraItems = recitalItems;
        extraFee += recitalItems.reduce((sum, item) => sum + item.amount, 0);
        if (!extraFeeLabel && recitalItems.length > 0) {
          extraFeeLabel = recitalItems.map((item) => item.label).join(', ');
        }
      }

      const baseFee = student.tuitionFee || 0;
      const discount = 0;
      const totalAmount = computeInvoiceTotal({
        baseFee,
        discount,
        textbookFee,
        extraFee,
      });

      const saved = store.saveInvoice({
        id: crypto.randomUUID(),
        studentId: student.id,
        studentName: student.name,
        yearMonth: ym,
        title: `${ym} 수강료`,
        baseFee,
        baseTuition: baseFee,
        discount,
        textbookFee,
        extraFee,
        extraFeeLabel,
        totalAmount,
        paidAmount: 0,
        unpaidAmount: totalAmount,
        dueDate,
        status: totalAmount <= 0 ? 'paid' : 'unpaid',
        notes: buildInvoiceNotes({
          yearMonth: ym,
          textbookCount: linkedTextbookSaleIds.length,
          extraItems: linkedExtraItems || [],
        }),
        includeExtras,
        linkedTextbookSaleIds:
          linkedTextbookSaleIds.length > 0 ? linkedTextbookSaleIds : undefined,
        linkedExtraItems:
          linkedExtraItems && linkedExtraItems.length > 0 ? linkedExtraItems : undefined,
        invoiceSent: false,
        sentAt: null,
      });

      if (linkedTextbookSaleIds.length > 0) {
        store.setTextbookBillingInvoice(linkedTextbookSaleIds, saved.id);
      }

      return saved;
    },

    generateMonthlyInvoicesForAllActive(yearMonth: string): number {
      const students = store.getStudents();
      const currentInvoices = store.getInvoices();
      const missing = listMonthlyTuitionMissingInvoices(students, currentInvoices, yearMonth);
      let generatedCount = 0;

      missing.forEach((student) => {
        const created = store.createInvoiceForStudent(student, yearMonth);
        if (created) generatedCount += 1;
      });

      return generatedCount;
    },

    deleteIncomeEntry(id: string): boolean {
      const entry = store.getIncomeEntries().find((row) => row.id === id);
      if (!entry) return false;

      if (entry.sourceType === 'tuition' && entry.sourceId) {
        store.reverseTuitionPayment(entry.sourceId);
        return true;
      }
      if (entry.sourceType === 'textbook' && entry.sourceId) {
        void Promise.resolve(store.reverseTextbookPayment(entry.sourceId)).catch((err) =>
          console.error('[deleteIncomeEntry] reverse textbook', err)
        );
        return true;
      }

      return store.deleteIncomeEntryRecord(id);
    },

    backfillBillingLinkedIncome() {
      return store.backfillBillingLinkedIncome();
    },
  };
}

export type InvoicePaymentServiceApi = ReturnType<typeof createInvoicePaymentService>;
