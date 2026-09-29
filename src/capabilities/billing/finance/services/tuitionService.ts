import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import { parentStorage } from '@/capabilities/parent/infrastructure/parentStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { settingsStorage } from '@/services/storage/settingsStorage';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type {
  AcademyEvent,
  AcademySettings,
  CombinedPaymentRequest,
  PaymentMethod,
  Student,
  StudentMonthlyBillingSummary,
  TextbookSale,
  TuitionInvoice,
  TuitionPayment,
} from '@/types';
import { findExistingStudentMonthInvoice } from '@/capabilities/billing/finance/invoiceDedupe';
import { filterMonthlyTuitionAutoGenerateStudents } from '@/capabilities/billing/finance/monthlyTuitionEligibility';
import { listMonthlyTuitionMissingInvoices } from '@/capabilities/billing/finance/monthlyTuitionEnsure';
import { findMonthlyTuitionInvoice } from '@/capabilities/billing/finance/monthlyTuitionStatus';
import { recordCombinedPayment } from '@/capabilities/billing/finance/application/recordCombinedPayment';
import {
  ensureMonthlyTuitionInvoiceAtomic,
  recordTuitionPaymentAtomic,
} from '@/capabilities/billing/finance/tuitionPaymentAtomic';
import { planInvoiceTextbookRelink } from '@/capabilities/billing/finance/invoiceTextbookLink';
import { getLatestTuitionPaymentForInvoice as pickLatestTuitionPaymentForInvoice } from '@/capabilities/billing/finance/latestTuitionPayment';
import { yearMonthLocal } from '@/shared/utils/localDate';

const ensureMonthInflight = new Map<string, Promise<{ created: number; existing: number }>>();

export { findExistingStudentMonthInvoice };

/**
 * 수강료·청구 도메인 파사드.
 * UI는 billingStorage 등 도메인 facade 대신 이 Service를 사용한다.
 */
export const TuitionService = {
  getInvoices(): TuitionInvoice[] {
    return billingStorage.getInvoices();
  },

  getInvoicesByStudent(studentId: string): TuitionInvoice[] {
    return billingStorage.getInvoices().filter((i) => i.studentId === studentId);
  },

  getInvoiceById(id: string): TuitionInvoice | undefined {
    return billingStorage.getInvoices().find((i) => i.id === id);
  },

  /** 동일 학생·연월 청구서 (있으면 반환) */
  findInvoiceForStudentMonth(
    studentId: string,
    yearMonth: string
  ): TuitionInvoice | undefined {
    return findExistingStudentMonthInvoice(this.getInvoices(), studentId, yearMonth);
  },

  getSettings(): AcademySettings {
    return settingsStorage.getSettings();
  },

  getTextbookSales(): TextbookSale[] {
    return commerceStorage.getTextbookSales();
  },

  getEvents(): AcademyEvent[] {
    return parentStorage.getEvents();
  },

  linkTextbookSalesToInvoice(saleIds: string[], invoiceId: string): void {
    commerceStorage.linkTextbookSalesToInvoice(saleIds, invoiceId);
  },

  saveInvoice(inv: Omit<TuitionInvoice, 'id'> & { id?: string }): TuitionInvoice {
    return billingStorage.saveInvoice(inv);
  },

  deleteInvoice(id: string): boolean {
    return billingStorage.deleteInvoice(id);
  },

  async createInvoiceForStudent(
    student: Student,
    yearMonth?: string,
    options?: { includeExtras?: boolean; extraFee?: number; extraFeeLabel?: string }
  ): Promise<TuitionInvoice | null> {
    const ym = yearMonth || yearMonthLocal();
    const existing = findMonthlyTuitionInvoice(this.getInvoices(), student.id, ym);
    if (existing) return existing;

    const local = billingStorage.createInvoiceForStudent(student, ym, options);
    if (!local || !isSupabaseConfigured()) return local;
    try {
      const remote = await ensureMonthlyTuitionInvoiceAtomic({
        studentId: student.id,
        studentName: student.name,
        yearMonth: local.yearMonth,
        title: local.title || `${local.yearMonth} 수강료`,
        billedAmount: local.totalAmount,
        dueDate: local.dueDate || undefined,
        metadata: {
          studentName: student.name,
          yearMonth: local.yearMonth,
          baseFee: local.baseFee,
          unpaidAmount: local.unpaidAmount,
          notes: local.notes,
          includeExtras: local.includeExtras,
          linkedTextbookSaleIds: local.linkedTextbookSaleIds,
        },
        invoiceId: local.id,
      });
      if (remote && remote.id !== local.id) {
        const plan = planInvoiceTextbookRelink({
          localInvoiceId: local.id,
          remoteInvoiceId: remote.id,
          localLinkedSaleIds: local.linkedTextbookSaleIds,
          remoteLinkedSaleIds: remote.linkedTextbookSaleIds,
          sales: commerceStorage.getTextbookSales(),
        });
        if (plan.saleIdsToRelink.length > 0) {
          commerceStorage.linkTextbookSalesToInvoice(plan.saleIdsToRelink, remote.id);
        }
        if (plan.invoiceLinksChanged) {
          billingStorage.saveInvoice({
            ...remote,
            linkedTextbookSaleIds:
              plan.nextLinkedSaleIds.length > 0 ? plan.nextLinkedSaleIds : undefined,
          });
        }
        billingStorage.deleteInvoice(local.id);
        return this.getInvoiceById(remote.id) || remote;
      }
      return remote || local;
    } catch (err) {
      console.error('[createInvoiceForStudent] ensure monthly invoice', err);
      throw err;
    }
  },

  async generateMonthlyInvoicesForAllActive(yearMonth: string): Promise<number> {
    const result = await this.ensureMonthlyInvoicesForMonth(yearMonth);
    return result.created;
  },

  /** 선택 월만. 없는 월회비 청구서만 생성하고 기존 건은 그대로 둔다. */
  async ensureMonthlyInvoicesForMonth(
    yearMonth: string
  ): Promise<{ created: number; existing: number }> {
    const pending = ensureMonthInflight.get(yearMonth);
    if (pending) return pending;

    const run = (async () => {
      const students = rosterStorage.getStudents();
      const invoices = this.getInvoices();
      const missing = listMonthlyTuitionMissingInvoices(students, invoices, yearMonth);
      const eligible = filterMonthlyTuitionAutoGenerateStudents(students, yearMonth);
      let created = 0;

      for (const student of missing) {
        const before = findMonthlyTuitionInvoice(this.getInvoices(), student.id, yearMonth);
        if (before) continue;
        const invoice = await this.createInvoiceForStudent(student, yearMonth);
        if (invoice) created += 1;
      }

      return { created, existing: eligible.length - missing.length };
    })().finally(() => {
      ensureMonthInflight.delete(yearMonth);
    });

    ensureMonthInflight.set(yearMonth, run);
    return run;
  },

  /**
   * 현금영수증 발행 요청.
   * 로컬 캐시를 갱신하고, 클라우드 설정 시 request_payment_cash_receipt RPC를 호출한다.
   */
  async requestCashReceipt(invoiceId: string): Promise<TuitionInvoice | null> {
    const updated = billingStorage.requestCashReceipt(invoiceId);
    if (!updated) return null;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await getCoreClient().rpc('request_payment_cash_receipt' as never, {
          p_payment_id: invoiceId,
        } as never);
        if (error) {
          console.warn('request_payment_cash_receipt RPC failed:', error.message);
        }
      } catch (err) {
        console.warn('request_payment_cash_receipt unavailable:', err);
      }
    }
    return updated;
  },

  async recordPayment(
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    notes?: string,
    paymentDate?: string,
    options?: { cashReceiptIssued?: boolean }
  ): Promise<TuitionInvoice | null> {
    return recordTuitionPaymentAtomic({
      invoiceId,
      amount,
      method,
      notes,
      paymentDate,
      cashReceiptIssued: options?.cashReceiptIssued,
    });
  },

  async recordCombinedPayment(req: CombinedPaymentRequest) {
    return recordCombinedPayment(req);
  },

  getTuitionPayments(): TuitionPayment[] {
    return billingStorage.getTuitionPayments();
  },

  /** 마지막 수납 표시용. Invoice snapshot이 아니라 TuitionPayment 원장. */
  getLatestTuitionPaymentForInvoice(invoiceId: string): TuitionPayment | null {
    return pickLatestTuitionPaymentForInvoice(this.getTuitionPayments(), invoiceId);
  },

  getStudentBillingSummary(
    studentId: string,
    yearMonth?: string
  ): StudentMonthlyBillingSummary {
    return commerceStorage.getStudentBillingSummary(studentId, yearMonth);
  },
};
