import { useRef, useState } from 'react';
import type { PaymentMethod, TuitionInvoice } from '@/types';
import { showToast } from '@/shared/feedback/uiFeedback';
import { TuitionService } from '@/capabilities/billing/finance/services/tuitionService';
import { runTuitionInvoicePayment } from './submitTuitionInvoicePayment';

/** 단일 청구서 수납의 요청 상태와 toast만 담당한다. */
export function useTuitionInvoicePayment(customerLabel: string) {
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (params: {
    invoice: TuitionInvoice | null;
    amount: number;
    method: PaymentMethod;
    memo?: string;
    paymentDate?: string;
    cashReceiptIssued?: boolean;
  }): Promise<boolean> => {
    setSubmitting(true);
    try {
      const result = await runTuitionInvoicePayment({
        busy,
        customerLabel,
        recordPayment: (invoiceId, amount, method, notes, paymentDate, options) =>
          TuitionService.recordPayment(invoiceId, amount, method, notes, paymentDate, options),
        ...params,
      });
      if (result.ok) {
        showToast(result.message, 'success');
        return true;
      }
      if ('toast' in result) {
        showToast(result.message, result.toast);
        return false;
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}
