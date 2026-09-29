import type {
  Student,
  Textbook,
  TextbookSale,
  TextbookPayment,
  StudentMonthlyBillingSummary,
  TuitionInvoice,
} from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { generateEntityId, getItem, setItem, type StorageApi } from './helpers';
import {
  isTextbookSaleDbAvailable,
  requireTextbookOrgId,
  textbookSaleDb,
} from '@/industries/piano/services/textbookSaleDb';
import {
  mergeTextbookPaymentsWithLegacy,
  mergeTextbookSalesWithLegacy,
} from '@/industries/piano/services/textbookSaleLegacy';

function buildReceiptNumber(): string {
  const now = new Date();
  const ymStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randNum = String(Math.floor(Math.random() * 900) + 100);
  return `RCP-TB-${ymStr}-${randNum}`;
}

function mirrorSales(sales: TextbookSale[]): void {
  setItem(STORAGE_KEYS.TEXTBOOK_SALES, sales);
}

function mirrorPayments(payments: TextbookPayment[]): void {
  setItem(STORAGE_KEYS.TEXTBOOK_PAYMENTS, payments);
}

/**
 * 교재 판매·수납 local mirror persistence + 읽기 집계.
 * Core/DB/Finance orchestration은 textbookSaleService.
 */
export function createTextbookSalesStorage(api: StorageApi) {
  return {
    /**
     * DB → 캐시 미러 갱신. legacy local-only 행은 id 중복 없이 유지(자동 업로드 없음).
     */
    async refreshTextbookCommerceFromDb(): Promise<void> {
      if (!isTextbookSaleDbAvailable()) return;
      const orgId = requireTextbookOrgId();
      const [dbSales, dbPayments] = await Promise.all([
        textbookSaleDb.listSales(orgId),
        textbookSaleDb.listPayments(orgId),
      ]);
      const localSales = getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
      const localPayments = getItem<TextbookPayment[]>(STORAGE_KEYS.TEXTBOOK_PAYMENTS, []);
      mirrorSales(mergeTextbookSalesWithLegacy(dbSales, localSales));
      mirrorPayments(mergeTextbookPaymentsWithLegacy(dbPayments, localPayments));
    },

    getTextbookSales(): TextbookSale[] {
      return getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []).map((s) =>
        (api.enrichSaleGuardian as (sale: TextbookSale) => TextbookSale)(s)
      );
    },

    enrichSaleGuardian(sale: TextbookSale): TextbookSale {
      const student = (api.getStudents as () => Student[])().find((s) => s.id === sale.studentId);
      if (!student?.parentName && !student?.parentPhone) return sale;
      return {
        ...sale,
        parentId: student.parentId ?? sale.parentId,
        parentName: student.parentName || sale.parentName,
        parentPhone: student.parentPhone || sale.parentPhone,
      };
    },

    getTextbookSaleById(id: string): TextbookSale | undefined {
      return (api.getTextbookSales as () => TextbookSale[])().find((s) => s.id === id);
    },

    /** 월청구 연결만 로컬 미러에 반영. DB 수납 경로는 바꾸지 않는다. */
    setTextbookBillingInvoice(saleIds: string[], invoiceId: string | undefined): void {
      if (saleIds.length === 0) return;
      const linkSet = new Set(saleIds);
      const now = new Date().toISOString();
      const sales = getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
      mirrorSales(
        sales.map((sale) =>
          linkSet.has(sale.id)
            ? { ...sale, billingInvoiceId: invoiceId, updatedAt: now }
            : sale
        )
      );
    },

    clearTextbookBillingInvoiceForInvoice(invoiceId: string): void {
      const now = new Date().toISOString();
      const sales = getItem<TextbookSale[]>(STORAGE_KEYS.TEXTBOOK_SALES, []);
      let changed = false;
      const next = sales.map((sale) => {
        if (sale.billingInvoiceId !== invoiceId) return sale;
        changed = true;
        return { ...sale, billingInvoiceId: undefined, updatedAt: now };
      });
      if (changed) mirrorSales(next);
    },

    getSalesByStudentId(studentId: string): TextbookSale[] {
      return (api.getTextbookSales as () => TextbookSale[])().filter((s) => s.studentId === studentId);
    },

    getTextbookPayments(): TextbookPayment[] {
      return getItem<TextbookPayment[]>(STORAGE_KEYS.TEXTBOOK_PAYMENTS, []);
    },

    getPaymentsBySaleId(saleId: string): TextbookPayment[] {
      return (api.getTextbookPayments as () => TextbookPayment[])().filter(
        (p) => p.textbookSaleId === saleId
      );
    },

    getPaymentsByStudentId(studentId: string): TextbookPayment[] {
      return (api.getTextbookPayments as () => TextbookPayment[])().filter(
        (p) => p.studentId === studentId
      );
    },

    /** @deprecated 내부·legacy 전용. 신규 수납은 recordTextbookPayment(DB) 사용 */
    saveTextbookPaymentDirect(
      data: Omit<TextbookPayment, 'id' | 'createdAt' | 'receiptNumber'>
    ): TextbookPayment {
      const payments = (api.getTextbookPayments as () => TextbookPayment[])();
      const newPayment: TextbookPayment = {
        ...data,
        id: generateEntityId('tp'),
        receiptNumber: buildReceiptNumber(),
        createdAt: new Date().toISOString(),
      };
      payments.unshift(newPayment);
      mirrorPayments(payments);
      return newPayment;
    },

    getStudentBillingSummary(studentId: string, yearMonth?: string): StudentMonthlyBillingSummary {
      const ym = yearMonth || new Date().toISOString().slice(0, 7);
      const students = (api.getStudents as () => Student[])();
      const student = students.find((s) => s.id === studentId);
      const studentName = student ? student.name : '미상 원생';

      const invoices = (api.getInvoices as () => TuitionInvoice[])().filter(
        (inv) =>
          inv.studentId === studentId &&
          (!yearMonth || inv.yearMonth === ym) &&
          inv.invoiceSent !== false &&
          inv.status !== 'cancelled'
      );
      const tuitionBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const tuitionPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const tuitionUnpaid = Math.max(0, tuitionBilled - tuitionPaid);
      const tuitionStatus =
        invoices.length === 0
          ? 'unpaid'
          : tuitionUnpaid === 0
            ? 'paid'
            : tuitionPaid > 0
              ? 'partial'
              : 'unpaid';

      const sales = (api.getTextbookSales as () => TextbookSale[])().filter(
        (s) =>
          s.studentId === studentId &&
          (!yearMonth || (s.saleDate || '').startsWith(ym)) &&
          !s.billingInvoiceId
      );
      const textbookBilled = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const textbookPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const textbookUnpaid = Math.max(0, textbookBilled - textbookPaid);
      const textbookStatus: 'unpaid' | 'partial' | 'paid' =
        sales.length === 0
          ? 'paid'
          : textbookUnpaid === 0
            ? 'paid'
            : textbookPaid > 0
              ? 'partial'
              : 'unpaid';

      return {
        studentId,
        studentName,
        yearMonth: ym,
        tuitionBilled,
        tuitionPaid,
        tuitionUnpaid,
        tuitionStatus,
        tuitionTotal: tuitionBilled,
        textbookBilled,
        textbookPaid,
        textbookUnpaid,
        textbookStatus,
        textbookTotal: textbookBilled,
        totalBilled: tuitionBilled + textbookBilled,
        totalPaid: tuitionPaid + textbookPaid,
        totalUnpaid: tuitionUnpaid + textbookUnpaid,
        grandTotal: tuitionBilled + textbookBilled,
        grandPaid: tuitionPaid + textbookPaid,
        grandUnpaid: tuitionUnpaid + textbookUnpaid,
        invoices,
        textbookSales: sales,
      };
    },

    getTextbookSalesByStudentId(studentId: string): TextbookSale[] {
      return (api.getTextbookSales as () => TextbookSale[])().filter((s) => s.studentId === studentId);
    },

    getAllStudentsBillingSummary(yearMonth?: string): StudentMonthlyBillingSummary[] {
      const students = (api.getStudents as () => Student[])().filter((s) => s.status === 'active');
      return students.map((s) =>
        (api.getStudentBillingSummary as (id: string, ym?: string) => StudentMonthlyBillingSummary)(
          s.id,
          yearMonth
        )
      );
    },

    getUnpaidTextbookSales(): (TextbookSale & { daysOverdue: number })[] {
      const sales = (api.getTextbookSales as () => TextbookSale[])();
      const today = new Date();

      return sales
        .filter(
          (s) => !s.billingInvoiceId && (s.status === 'unpaid' || s.status === 'partial')
        )
        .map((s) => {
          const saleD = new Date(s.saleDate);
          const diffTime = Math.max(0, today.getTime() - saleD.getTime());
          const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return { ...s, daysOverdue };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);
    },

    getTextbookStats(yearMonth?: string): {
      monthlySaleAmount: number;
      monthlyPaidAmount: number;
      totalSalesAmount: number;
      totalPaidAmount: number;
      totalUnpaidAmount: number;
      unpaidStudentsCount: number;
      monthlyBooksSold: number;
      lowStockBooksCount: number;
    } {
      const ym = yearMonth || new Date().toISOString().slice(0, 7);
      const allSales = (api.getTextbookSales as () => TextbookSale[])();
      const allPayments = (api.getTextbookPayments as () => TextbookPayment[])();
      const allTextbooks = (api.getTextbooks as () => Textbook[])();

      const monthlySales = allSales.filter((s) => s.saleDate.startsWith(ym));
      const monthlySaleAmount = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const monthlyBooksSold = monthlySales.reduce((sum, s) => sum + s.quantity, 0);

      const monthlyPayments = allPayments.filter((p) => p.paymentDate.startsWith(ym));
      const monthlyPaidAmount = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

      const unpaidSales = allSales.filter((s) => s.status === 'unpaid' || s.status === 'partial');
      const totalUnpaidAmount = unpaidSales.reduce((sum, s) => sum + s.unpaidAmount, 0);

      const unpaidStudentIds = new Set(unpaidSales.map((s) => s.studentId));
      const unpaidStudentsCount = unpaidStudentIds.size;

      const lowStockBooksCount = allTextbooks.filter((t) => t.stock <= t.minStock).length;

      return {
        monthlySaleAmount,
        monthlyPaidAmount,
        totalSalesAmount: monthlySaleAmount,
        totalPaidAmount: monthlyPaidAmount,
        totalUnpaidAmount,
        unpaidStudentsCount,
        monthlyBooksSold,
        lowStockBooksCount,
      };
    },
  };
}
