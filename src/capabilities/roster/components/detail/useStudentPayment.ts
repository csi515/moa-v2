import { useState } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { CanonicalPaymentMethod, Money } from '@/shared/kernel';

export interface UseStudentPaymentParams {
  onRecordPayment?: (
    invoiceId: string,
    amount: Money,
    method: CanonicalPaymentMethod,
    memo: string
  ) => Promise<any>;
}

export function useStudentPayment(params?: UseStudentPaymentParams) {
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<Money>(0);
  const [payMethod, setPayMethod] = useState<CanonicalPaymentMethod>('onsite_card');
  const [payMemo, setPayMemo] = useState('');

  const handleOpenPayModal = (inv: { id: string; unpaidAmount: number }) => {
    setPayInvoiceId(inv.id);
    setPayAmount(inv.unpaidAmount);
    setPayMethod('onsite_card');
    setPayMemo('');
  };

  const handleProcessPayment = async () => {
    if (!payInvoiceId) return;
    try {
      if (!params?.onRecordPayment) {
        showToast('결제 처리 함수가 설정되지 않았습니다.', 'error');
        return;
      }
      const updated = await params.onRecordPayment(payInvoiceId, payAmount, payMethod, payMemo);
      if (!updated) {
        showToast('수납 처리에 실패했습니다.', 'error');
        return;
      }
      showToast(`₩${payAmount.toLocaleString()}원 수납 처리가 완료되었습니다.`, 'success');
      setPayInvoiceId(null);
    } catch (err) {
      showToast.error(err, '수납 처리에 실패했습니다.');
    }
  };

  return {
    payInvoiceId,
    setPayInvoiceId,
    payAmount,
    setPayAmount,
    payMethod,
    setPayMethod,
    payMemo,
    setPayMemo,
    onOpenPayModal: handleOpenPayModal,
    onProcessPayment: handleProcessPayment,
  };
}
