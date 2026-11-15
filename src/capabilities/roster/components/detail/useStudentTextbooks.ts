import { useState } from 'react';
import type { CanonicalTextbookSaleItem } from '@/shared/kernel';

export function useStudentTextbooks() {
  const [isStudentSaleModalOpen, setIsStudentSaleModalOpen] = useState(false);
  const [isStudentTbPaymentModalOpen, setIsStudentTbPaymentModalOpen] = useState(false);
  const [selectedStudentSaleForPay, setSelectedStudentSaleForPay] = useState<CanonicalTextbookSaleItem | null>(null);
  const [isTbReceiptOpen, setIsTbReceiptOpen] = useState(false);
  const [tbReceiptSale, setTbReceiptSale] = useState<CanonicalTextbookSaleItem | null>(null);

  return {
    isStudentSaleModalOpen,
    setIsStudentSaleModalOpen,
    isStudentTbPaymentModalOpen,
    setIsStudentTbPaymentModalOpen,
    selectedStudentSaleForPay,
    setSelectedStudentSaleForPay,
    isTbReceiptOpen,
    setIsTbReceiptOpen,
    tbReceiptSale,
    setTbReceiptSale,
  };
}
