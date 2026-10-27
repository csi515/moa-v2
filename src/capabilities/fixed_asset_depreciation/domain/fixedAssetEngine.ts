export type AssetAuditStatus =
  | 'active_normal'
  | 'needs_repair'
  | 'missing'
  | 'scrapped';

export interface FixedAssetItem {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  acquisitionCost: number;
  acquisitionDate: string; // 'YYYY-MM-DD'
  usefulLifeYears: number; // e.g. 5
  salvageValue: number; // e.g. 1000
  auditStatus: AssetAuditStatus;
}

export function calculateMonthlyDepreciation(
  cost: number,
  salvage: number,
  usefulLifeYears: number
): number {
  if (usefulLifeYears <= 0) return 0;
  const totalDepreciable = Math.max(0, cost - salvage);
  const totalMonths = usefulLifeYears * 12;
  return Math.round(totalDepreciable / totalMonths);
}

export function calculateAccumulatedDepreciation(
  cost: number,
  salvage: number,
  usefulLifeYears: number,
  acquisitionDate: string,
  asOfDate: string
): {
  accumulated: number;
  bookValue: number;
  elapsedMonths: number;
  isFullyDepreciated: boolean;
} {
  const start = new Date(acquisitionDate);
  const current = new Date(asOfDate);

  const yearDiff = current.getFullYear() - start.getFullYear();
  const monthDiff = current.getMonth() - start.getMonth();
  const rawMonths = yearDiff * 12 + monthDiff;
  const elapsedMonths = Math.max(0, rawMonths);

  const totalMonths = usefulLifeYears * 12;
  const monthly = calculateMonthlyDepreciation(cost, salvage, usefulLifeYears);

  const maxDepreciable = Math.max(0, cost - salvage);
  const rawAccumulated =
    elapsedMonths >= totalMonths
      ? maxDepreciable
      : monthly * elapsedMonths;
  const accumulated = Math.min(maxDepreciable, rawAccumulated);
  const bookValue = cost - accumulated;

  const isFullyDepreciated = elapsedMonths >= totalMonths;

  return {
    accumulated,
    bookValue,
    elapsedMonths,
    isFullyDepreciated,
  };
}

export function filterAssetsRequiringAudit(assets: FixedAssetItem[]): FixedAssetItem[] {
  return assets.filter(
    (a) => a.auditStatus === 'needs_repair' || a.auditStatus === 'missing'
  );
}
