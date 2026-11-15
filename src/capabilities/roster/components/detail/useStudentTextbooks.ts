import { useState } from 'react';

export function useStudentTextbooks() {
  const [isStudentSaleModalOpen, setIsStudentSaleModalOpen] = useState(false);
  const [isStudentTbPaymentModalOpen, setIsStudentTbPaymentModalOpen] = useState(false);
  const [selectedStudentSaleForPay, setSelectedStudentSaleForPay] = useState<any>(null);
  const [isTbReceiptOpen, setIsTbReceiptOpen] = useState(false);
  const [tbReceiptSale, setTbReceiptSale] = useState<any>(null);

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
