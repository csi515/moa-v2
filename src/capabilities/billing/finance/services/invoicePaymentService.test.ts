/**
 * invoicePaymentService는 Storage API만 사용한다.
 * 실행: npm run test:invoice-payment-service
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AcademySettings,
  Student,
  TextbookSale,
  TuitionInvoice,
  TuitionPayment,
} from '@/types';
import type { IncomeEntry } from '@/capabilities/billing/finance/types';
import { createInvoicePaymentService } from './invoicePaymentService';
import type { StorageApi } from '@/services/storage/helpers';
import { resolveLastTuitionPaymentDisplay } from '@/capabilities/billing/finance/latestTuitionPayment';

function student(partial: Partial<Student> & Pick<Student, 'id' | 'name'>): Student {
  return {
    studentNumber: 'STU-1',
    gender: 'F',
    birthDate: '2018-01-01',
    school: '',
    grade: '',
    status: 'active',
    billingMode: 'monthly',
    tuitionFee: 100000,
    paymentDay: 10,
    joinDate: '2026-01-01',
    teacherId: 't1',
    teacherName: '교사',
    classIds: [],
    level: '초급',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function sale(partial: Partial<TextbookSale> & Pick<TextbookSale, 'id'>): TextbookSale {
  return {
    studentId: 'stu-1',
    studentName: '원생',
    parentName: '',
    parentPhone: '',
    textbookId: 'tb-1',
    textbookTitle: '교재',
    saleDate: '2026-09-01',
    quantity: 1,
    unitPrice: 15000,
    discount: 0,
    totalAmount: 15000,
    paidAmount: 0,
    unpaidAmount: 15000,
    status: 'unpaid',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

function createMemoryStore() {
  const invoices: TuitionInvoice[] = [];
  const payments: TuitionPayment[] = [];
  const sales: TextbookSale[] = [];
  const income: IncomeEntry[] = [];
  const settings: AcademySettings = {
    name: '',
    address: '',
    phone: '',
    includeExtrasInMonthlyInvoice: true,
    defaultTuitionFee: 180000,
  };

  const store = {
    invoices,
    payments,
    sales,
    income,
    getInvoices: () => invoices.slice(),
    saveInvoice: (inv: Omit<TuitionInvoice, 'id'> & { id?: string }) => {
      const saved = { ...inv, id: inv.id || `inv-${invoices.length + 1}` } as TuitionInvoice;
      const idx = invoices.findIndex((row) => row.id === saved.id);
      if (idx >= 0) invoices[idx] = { ...invoices[idx], ...saved };
      else invoices.unshift(saved);
      return invoices.find((row) => row.id === saved.id) || saved;
    },
    deleteInvoiceRecord: (id: string) => {
      const before = invoices.length;
      const next = invoices.filter((row) => row.id !== id);
      invoices.splice(0, invoices.length, ...next);
      return next.length !== before;
    },
    getTuitionPayments: () => payments.slice(),
    getTuitionPaymentsByInvoiceId: (invoiceId: string) =>
      payments.filter((row) => row.invoiceId === invoiceId),
    saveTuitionPayment: (
      data: Omit<TuitionPayment, 'id' | 'createdAt' | 'receiptNumber'> & { receiptNumber?: string }
    ) => {
      const payment: TuitionPayment = {
        ...data,
        id: `pay-${payments.length + 1}`,
        receiptNumber: data.receiptNumber || 'REC-TEST',
        createdAt: '2026-09-25T00:00:00.000Z',
      };
      payments.unshift(payment);
      return payment;
    },
    removeTuitionPayment: (paymentId: string) => {
      const before = payments.length;
      const next = payments.filter((row) => row.id !== paymentId);
      payments.splice(0, payments.length, ...next);
      return next.length !== before;
    },
    removeTuitionPaymentsByInvoiceId: (invoiceId: string) => {
      const removed = payments.filter((row) => row.invoiceId === invoiceId);
      const next = payments.filter((row) => row.invoiceId !== invoiceId);
      payments.splice(0, payments.length, ...next);
      return removed;
    },
    getIncomeEntries: () => income.slice(),
    deleteIncomeEntryRecord: (id: string) => {
      const before = income.length;
      const next = income.filter((row) => row.id !== id);
      income.splice(0, income.length, ...next);
      return next.length !== before;
    },
    upsertLinkedIncome: (params: { paymentId: string; amount: number; date: string }) => {
      const existing = income.find((row) => row.sourceType === 'tuition' && row.sourceId === params.paymentId);
      const entry: IncomeEntry = {
        id: existing?.id || `inc-${income.length + 1}`,
        date: params.date,
        category: 'membership',
        amount: params.amount,
        paymentMethod: 'cash',
        description: '수강료',
        payer: '원생',
        sourceType: 'tuition',
        sourceId: params.paymentId,
      };
      if (existing) {
        const idx = income.findIndex((row) => row.id === existing.id);
        income[idx] = entry;
      } else income.unshift(entry);
      return entry;
    },
    backfillBillingLinkedIncome: () => ({ tuitionCreated: 0, textbookCreated: 0 }),
    deleteLinkedIncome: (_source: string, paymentId: string) => {
      const before = income.length;
      const next = income.filter((row) => row.sourceId !== paymentId);
      income.splice(0, income.length, ...next);
      return next.length !== before;
    },
    getSettings: () => settings,
    getTextbookSales: () => sales.slice(),
    getEvents: () => [],
    getStudents: () => [],
    setTextbookBillingInvoice: (saleIds: string[], invoiceId: string | undefined) => {
      const set = new Set(saleIds);
      for (let i = 0; i < sales.length; i += 1) {
        if (set.has(sales[i].id)) sales[i] = { ...sales[i], billingInvoiceId: invoiceId };
      }
    },
    clearTextbookBillingInvoiceForInvoice: (invoiceId: string) => {
      for (let i = 0; i < sales.length; i += 1) {
        if (sales[i].billingInvoiceId === invoiceId) {
          sales[i] = { ...sales[i], billingInvoiceId: undefined };
        }
      }
    },
    reverseLinkedTextbookPaymentsForTuition: () => undefined,
    reverseTuitionPayment: (paymentId: string) => service.reverseTuitionPayment(paymentId),
    reverseTextbookPayment: () => true,
    createInvoiceForStudent: (stu: Student, ym?: string) => service.createInvoiceForStudent(stu, ym),
  };

  const service = createInvoicePaymentService(store as unknown as StorageApi);
  return { store, service };
}

function run() {
  const here = dirname(fileURLToPath(import.meta.url));
  const serviceSrc = readFileSync(join(here, 'invoicePaymentService.ts'), 'utf8');
  assert.equal(serviceSrc.includes('getItem'), false);
  assert.equal(serviceSrc.includes('setItem'), false);
  assert.equal(serviceSrc.includes('STORAGE_KEYS'), false);
  assert.equal(serviceSrc.includes('TEXTBOOK_SALES'), false);
  assert.match(serviceSrc, /saveInvoice/);
  assert.match(serviceSrc, /setTextbookBillingInvoice/);
  assert.match(serviceSrc, /clearTextbookBillingInvoiceForInvoice/);
  assert.equal(serviceSrc.includes('paidAt: pDate'), false);
  assert.equal(serviceSrc.includes('paidDate: pDate'), false);

  // invoice 생성 + textbook 연결
  {
    const { store, service } = createMemoryStore();
    store.sales.push(sale({ id: 'sale-1', studentId: 'stu-1' }));
    const created = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09');
    assert.ok(created);
    assert.equal(created.totalAmount, 115000);
    assert.deepEqual(created.linkedTextbookSaleIds, ['sale-1']);
    assert.equal(store.sales[0].billingInvoiceId, created.id);
  }

  // 같은 월 재생성은 기존 invoice
  {
    const { service } = createMemoryStore();
    const first = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09', {
      includeExtras: false,
    });
    const second = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09', {
      includeExtras: false,
    });
    assert.equal(first?.id, second?.id);
  }

  // payment + linked income, reverse는 둘 다 되돌림
  {
    const { store, service } = createMemoryStore();
    const created = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09', {
      includeExtras: false,
    });
    assert.ok(created);
    const paid = service.recordPayment(created.id, 40000, 'cash');
    assert.equal(paid?.paidAmount, 40000);
    assert.equal(paid?.status, 'partial');
    assert.equal(paid?.paymentMethod, undefined);
    assert.equal(paid?.paidAt, undefined);
    assert.equal(paid?.paidDate, undefined);
    assert.equal(store.payments[0].paymentMethod, 'cash');
    assert.equal(store.payments.length, 1);
    assert.equal(store.income.length, 1);
    assert.equal(service.reverseTuitionPayment(store.payments[0].id), true);
    assert.equal(store.payments.length, 0);
    assert.equal(store.income.length, 0);
    assert.equal(store.invoices[0].paidAmount, 0);
  }

  // 오래된 Invoice snapshot은 유지하고, 마지막 수납 표시는 TuitionPayment
  {
    const { store, service } = createMemoryStore();
    const created = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09', {
      includeExtras: false,
    });
    assert.ok(created);
    store.saveInvoice({
      ...created,
      paymentMethod: 'cash',
      paidAt: '2026-09-01',
      paidDate: '2026-09-01',
    });
    const first = service.recordPayment(created.id, 30000, 'card', undefined, '2026-09-03');
    assert.equal(first?.status, 'partial');
    assert.equal(first?.paymentMethod, 'cash');
    assert.equal(first?.paidAt, '2026-09-01');
    assert.equal(store.payments[0].paymentMethod, 'card');
    assert.equal(store.payments[0].amount, 30000);
    const second = service.recordPayment(created.id, 70000, 'transfer', undefined, '2026-09-08');
    assert.equal(second?.status, 'paid');
    assert.equal(second?.paymentMethod, 'cash');
    assert.equal(second?.paidDate, '2026-09-01');
    const display = resolveLastTuitionPaymentDisplay(store.payments, created.id);
    assert.equal(display?.paymentMethod, 'transfer');
    assert.equal(display?.amount, 70000);
    assert.equal(display?.paymentDate, '2026-09-08');
  }

  // 삭제 시 invoice·연결 제거, 저장은 store API만
  {
    const { store, service } = createMemoryStore();
    store.sales.push(sale({ id: 'sale-1', studentId: 'stu-1' }));
    const created = service.createInvoiceForStudent(student({ id: 'stu-1', name: '원생' }), '2026-09');
    assert.ok(created);
    service.recordPayment(created.id, 10000, 'cash');
    assert.equal(service.deleteInvoice(created.id), true);
    assert.equal(store.invoices.length, 0);
    assert.equal(store.payments.length, 0);
    assert.equal(store.income.length, 0);
    assert.equal(store.sales[0].billingInvoiceId, undefined);
  }

  console.log('invoicePaymentService.test.ts: ok');
}

run();
