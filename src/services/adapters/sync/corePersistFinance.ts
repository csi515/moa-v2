import type { TuitionInvoice, TuitionPayment } from '../../../types';
import { writeLocal } from '../localStorageEngine';
import { STORAGE_KEYS } from '../storageKeys';
import { invoiceToPaymentRow } from './entityMappers';
import {
  expenseToCoreRow,
  incomeToCoreRow,
  settlementToCoreRow,
  tuitionPaymentToTransactionRow,
} from './financeEntityMappers';
import type { FinanceExpense, IncomeEntry } from '../../../core/finance/types';
import type { TeacherPayrollSettlement } from '../../../core/finance/teacherPayroll/settlements';
import type { PersistAbortGuard, SyncCache } from './syncTypes';
import { requireCacheList, runRowUpserts } from './persistHelpers';
import type { CoreClient } from './corePersistSyncTable';
import { syncTable } from './corePersistSyncTable';

export async function persistPayments(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const invoices = requireCacheList<TuitionInvoice>(cache, STORAGE_KEYS.INVOICES, 'payments');
  if (!invoices) return false;
  // persist payload는 payment_method/paid_at를 포함하지 않는다.

  const ok = await syncTable(
    client,
    'payments',
    orgId,
    invoices.map((i) => i.id),
    () =>
      runRowUpserts(
        invoices,
        isAborted,
        (inv) => client.from('payments').upsert(invoiceToPaymentRow(inv, orgId)),
        (error) => console.error('Failed to upsert payment:', error)
      ),
    { cachePresent: true, context: 'payments', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.INVOICES, invoices);
  return ok;
}

export async function persistTuitionPayments(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const paymentsOk = await persistPayments(client, orgId, cache, isAborted);
  if (!paymentsOk || isAborted()) return false;

  const payments = requireCacheList<TuitionPayment>(
    cache,
    STORAGE_KEYS.TUITION_PAYMENTS,
    'payment_transactions'
  );
  if (!payments) return false;

  const ok = await syncTable(
    client,
    'payment_transactions',
    orgId,
    payments.map((p) => p.id),
    () =>
      runRowUpserts(
        payments,
        isAborted,
        (payment) =>
          client.from('payment_transactions').upsert(tuitionPaymentToTransactionRow(payment, orgId)),
        (error) => console.error('Failed to upsert payment_transaction:', error)
      ),
    { cachePresent: true, context: 'payment_transactions', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.TUITION_PAYMENTS, payments);
  return ok;
}

export async function persistExpenses(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const expenses = requireCacheList<FinanceExpense>(cache, STORAGE_KEYS.EXPENSES, 'expenses');
  if (!expenses) return false;

  const ok = await syncTable(
    client,
    'expenses',
    orgId,
    expenses.map((e) => e.id),
    () =>
      runRowUpserts(
        expenses,
        isAborted,
        (expense) => client.from('expenses').upsert(expenseToCoreRow(expense, orgId)),
        (error) => console.error('Failed to upsert expense:', error)
      ),
    { cachePresent: true, context: 'expenses', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.EXPENSES, expenses);
  return ok;
}

export async function persistIncomeEntries(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const entries = requireCacheList<IncomeEntry>(cache, STORAGE_KEYS.INCOME_ENTRIES, 'income_entries');
  if (!entries) return false;

  const ok = await syncTable(
    client,
    'income_entries',
    orgId,
    entries.map((e) => e.id),
    () =>
      runRowUpserts(
        entries,
        isAborted,
        (entry) => client.from('income_entries').upsert(incomeToCoreRow(entry, orgId)),
        (error) => console.error('Failed to upsert income entry:', error)
      ),
    { cachePresent: true, context: 'income_entries', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.INCOME_ENTRIES, entries);
  return ok;
}

export async function persistTeacherPayrollSettlements(
  client: CoreClient,
  orgId: string,
  cache: SyncCache,
  isAborted: PersistAbortGuard
): Promise<boolean> {
  if (isAborted()) return false;
  const settlements = requireCacheList<TeacherPayrollSettlement>(
    cache,
    STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS,
    'teacher_payroll_settlements'
  );
  if (!settlements) return false;

  const syncOk = await syncTable(
    client,
    'teacher_payroll_settlements',
    orgId,
    settlements.map((s) => s.id),
    () =>
      runRowUpserts(
        settlements,
        isAborted,
        (settlement) =>
          client.from('teacher_payroll_settlements').upsert(settlementToCoreRow(settlement, orgId)),
        (error) => console.error('Failed to upsert teacher_payroll_settlement:', error)
      ),
    { cachePresent: true, context: 'teacher_payroll_settlements', isAborted }
  );

  if (isAborted()) return false;
  writeLocal(STORAGE_KEYS.TEACHER_PAYROLL_SETTLEMENTS, settlements);
  return syncOk;
}
