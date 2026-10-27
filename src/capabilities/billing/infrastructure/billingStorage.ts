import { createFinanceInvoicePersist } from '@/services/storage/financeInvoicePersist';
import { createFinanceStorage } from '@/services/storage/financeStorage';
import { createInvoicePaymentService } from '@/capabilities/billing/finance/services/invoicePaymentService';
import type { StorageApi } from '@/services/storage/helpers';
import { storageApi } from '@/services/storage/storageApi';

/** Billing persistence facade. 기존 finance/invoice factory를 연결한다. */
export function createBillingCapabilityStorage(api: StorageApi) {
  return {
    ...createFinanceStorage(api),
    ...createFinanceInvoicePersist(api),
    ...createInvoicePaymentService(api),
  };
}

export type BillingCapabilityStorage = ReturnType<typeof createBillingCapabilityStorage>;

/** Billing persist SoT. 신규 코드는 StorageService가 아니라 이 싱글톤을 쓴다. */
export const billingStorage = createBillingCapabilityStorage(storageApi);
