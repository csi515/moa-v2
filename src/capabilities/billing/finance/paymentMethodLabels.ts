import type { PaymentMethod } from './paymentMethod';

/** 수기 수납·수입 공통 결제수단 라벨 */
export const PAYMENT_METHOD_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'local_currency', label: '지역사랑상품권' },
  { id: 'onsite_card', label: '현장 카드결제' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'cash', label: '현금' },
  { id: 'card', label: '신용/체크카드' },
  { id: 'other', label: '기타' },
];

/** 원장 수기 완납 모달 기본 4종 */
export const ONSITE_PAYMENT_METHOD_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'local_currency', label: '지역사랑상품권' },
  { id: 'onsite_card', label: '현장 카드결제' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'cash', label: '현금' },
];

export function formatPaymentMethodLabel(method?: PaymentMethod | string | null): string {
  if (!method) return '-';
  const found = PAYMENT_METHOD_OPTIONS.find((m) => m.id === method);
  if (found) return found.label;
  if (method === 'online') return '온라인';
  return String(method);
}

export function formatBankAccountText(
  bankAccount?: string | { bank: string; accountNumber: string; holder: string }
): string {
  if (!bankAccount) return '';
  if (typeof bankAccount === 'string') return bankAccount.trim();
  const parts = [bankAccount.bank, bankAccount.accountNumber, bankAccount.holder].filter(Boolean);
  return parts.join(' ').trim();
}

/** 학부모에게 노출 가능한 발송된 청구서 (레거시 sentAt 없음 = 발송됨) */
export function isInvoiceVisibleToParent(invoice: {
  sentAt?: string | null;
  invoiceSent?: boolean;
}): boolean {
  if (invoice.invoiceSent === false) return false;
  if (invoice.invoiceSent === true) return true;
  if (invoice.sentAt) return true;
  // 레거시: 발송 플래그 없으면 기존처럼 노출
  return invoice.invoiceSent === undefined && invoice.sentAt === undefined;
}
