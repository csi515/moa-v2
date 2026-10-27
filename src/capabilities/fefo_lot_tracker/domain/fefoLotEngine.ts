export type LotStatus = 'available' | 'expiring_soon' | 'expired' | 'depleted';

export interface LotItemRecord {
  id: string;
  itemCode: string;
  itemName: string;
  lotNumber: string;
  expiryDate: string; // 'YYYY-MM-DD'
  currentStockQty: number;
  locationRack: string;
  status: LotStatus;
}

export function getDaysUntilExpiry(expiryDate: string, currentDateStr: string): number {
  const current = new Date(currentDateStr).getTime();
  const expiry = new Date(expiryDate).getTime();
  const diffMs = expiry - current;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function determineLotStatus(
  expiryDate: string,
  currentStock: number,
  currentDateStr: string,
  warningDays: number
): LotStatus {
  if (currentStock <= 0) return 'depleted';

  const daysLeft = getDaysUntilExpiry(expiryDate, currentDateStr);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warningDays) return 'expiring_soon';
  return 'available';
}

export function getFefoRecommendedLot(
  lots: LotItemRecord[],
  itemCode: string,
  currentDateStr: string
): LotItemRecord | undefined {
  const availableLots = lots.filter(
    (l) =>
      l.itemCode === itemCode &&
      l.currentStockQty > 0 &&
      getDaysUntilExpiry(l.expiryDate, currentDateStr) >= 0
  );

  if (availableLots.length === 0) return undefined;

  // 유통기한이 가장 빠른 순서대로 정렬 (FEFO)
  availableLots.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  return availableLots[0];
}

export function filterExpiringLots(
  lots: LotItemRecord[],
  currentDateStr: string,
  withinDays: number
): LotItemRecord[] {
  return lots.filter((l) => {
    if (l.currentStockQty <= 0) return false;
    const days = getDaysUntilExpiry(l.expiryDate, currentDateStr);
    return days >= 0 && days <= withinDays;
  });
}
