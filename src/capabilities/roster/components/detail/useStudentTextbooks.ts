import { useState } from 'react';

export interface StudentTextbookSaleItem {
  id: string;
  [key: string]: any;
}

export function useStudentTextbooks() {
  const [isStudentSaleModalOpen, setIsStudentSaleModalOpen] = useState(false);
  const [isStudentTbPaymentModalOpen, setIsStudentTbPaymentModalOpen] = useState(false);
  const [selectedStudentSaleForPay, setSelectedStudentSaleForPay] = useState<StudentTextbookSaleItem | null>(null);
  const [isTbReceiptOpen, setIsTbReceiptOpen] = useState(false);
  const [tbReceiptSale, setTbReceiptSale] = useState<StudentTextbookSaleItem | null>(null);

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
