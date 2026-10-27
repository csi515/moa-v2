export type ProcurementStage =
  | 'PR_REQUESTED'
  | 'PO_APPROVED'
  | 'GR_RECEIVED'
  | 'MATCHED'
  | 'DISCREPANCY';

export interface ProcurementMatchRecord {
  id: string;
  requisitionNumber: string;
  itemName: string;
  requestedQty: number;
  approvedQty: number;
  approvedUnitPrice: number;
  receivedQty: number;
  invoicedUnitPrice: number;
  status: ProcurementStage;
}

export function validateThreeWayMatch(
  approvedQty: number,
  receivedQty: number,
  approvedPrice: number,
  invoicedPrice: number
): {
  isMatched: boolean;
  qtyDiscrepancy: number;
  priceDiscrepancy: number;
  reason?: string;
} {
  const qtyDiscrepancy = receivedQty - approvedQty;
  const priceDiscrepancy = invoicedPrice - approvedPrice;

  if (qtyDiscrepancy !== 0 && priceDiscrepancy !== 0) {
    return {
      isMatched: false,
      qtyDiscrepancy,
      priceDiscrepancy,
      reason: `수량 불일치(${qtyDiscrepancy > 0 ? '+' : ''}${qtyDiscrepancy}) 및 단가 불일치(${priceDiscrepancy > 0 ? '+' : ''}${priceDiscrepancy}원)`,
    };
  }

  if (qtyDiscrepancy !== 0) {
    return {
      isMatched: false,
      qtyDiscrepancy,
      priceDiscrepancy: 0,
      reason: `발주 수량(${approvedQty})과 입고 수량(${receivedQty}) 불일치`,
    };
  }

  if (priceDiscrepancy !== 0) {
    return {
      isMatched: false,
      qtyDiscrepancy: 0,
      priceDiscrepancy,
      reason: `승인 단가(${approvedPrice}원)와 청구 단가(${invoicedPrice}원) 불일치`,
    };
  }

  return {
    isMatched: true,
    qtyDiscrepancy: 0,
    priceDiscrepancy: 0,
  };
}

export function calculateTotalApprovedAmount(records: ProcurementMatchRecord[]): number {
  return records.reduce((sum, r) => sum + r.approvedQty * r.approvedUnitPrice, 0);
}

export function filterDiscrepancies(
  records: ProcurementMatchRecord[]
): ProcurementMatchRecord[] {
  return records.filter((r) => r.status === 'DISCREPANCY');
}
