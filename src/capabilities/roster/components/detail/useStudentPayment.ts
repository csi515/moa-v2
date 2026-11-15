import { useState } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';

export type StudentPaymentMethod = 'onsite_card' | 'transfer' | 'cash' | 'auto_transfer' | string;

export interface StudentPaymentInvoice {
  id: string;
  unpaidAmount: number;
}

export interface UseStudentPaymentParams {
  onRecordPayment?: (
    invoiceId: string,
    amount: number,
    method: any,
    memo: string
  ) => Promise<boolean | undefined>;
}

export function useStudentPayment(params?: UseStudentPaymentParams) {
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<StudentPaymentMethod>('onsite_card');
  const [payMemo, setPayMemo] = useState('');

  const handleOpenPayModal = (inv: StudentPaymentInvoice) => {
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
