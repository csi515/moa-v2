export type PackageSubItemType = 'session' | 'period_days';

export interface PackageSubItem {
  id: string;
  name: string; // 예: "헬스장 3개월 이용권", "1:1 PT 10회"
  type: PackageSubItemType;
  allocatedPrice: number; // 패키지 내 배분 금액 (예: 300,000원, 700,000원)
  totalUnits: number; // 총 단위수 (예: 90일, 10회)
  consumedUnits: number; // 소진 단위수 (예: 30일, 4회)
}

export interface SoldPackageContract {
  id: string;
  customerName: string;
  packageName: string; // 예: "헬스+PT 올인원 콤보 팩"
  totalPackagePrice: number; // 일시불 결제총액 (예: 1,000,000원)
  soldAt: string; // ISO
  subItems: PackageSubItem[];
  status: 'active' | 'completed' | 'cancelled';
}

export interface PackageRealizationMetrics {
  totalAllocatedPrice: number;
  totalRecognizedRevenue: number; // 현재까지 실현된 매출
  remainingUnearnedLiability: number; // 현재 남아있는 선수금 부채
  realizationRatePercent: number; // 매출 실현율 (%)
}

/**
 * 패키지 내 각 항목의 소진 현황에 따른 실현 매출과 선수금 부채 잔액을 계산합니다.
 */
export function calculatePackageRealization(pkg: SoldPackageContract): PackageRealizationMetrics {
  let totalAllocatedPrice = 0;
  let totalRecognizedRevenue = 0;

  for (const item of pkg.subItems) {
    totalAllocatedPrice += item.allocatedPrice;
    const progress = Math.min(1, Math.max(0, item.consumedUnits / Math.max(1, item.totalUnits)));
    totalRecognizedRevenue += Math.round(item.allocatedPrice * progress);
  }

  const remainingUnearnedLiability = Math.max(0, totalAllocatedPrice - totalRecognizedRevenue);
  const realizationRatePercent = totalAllocatedPrice > 0
    ? Math.round((totalRecognizedRevenue / totalAllocatedPrice) * 100)
    : 0;

  return {
    totalAllocatedPrice,
    totalRecognizedRevenue,
    remainingUnearnedLiability,
    realizationRatePercent,
  };
}

/**
 * 세션 1회 차감 또는 일수 경과 시 소진 단위를 업데이트합니다.
 */
export function consumePackageUnits(
  pkg: SoldPackageContract,
  subItemId: string,
  unitsToConsume: number = 1
): SoldPackageContract {
  const updatedItems = pkg.subItems.map((item) => {
    if (item.id !== subItemId) return item;
    const nextConsumed = Math.min(item.totalUnits, item.consumedUnits + unitsToConsume);
    return {
      ...item,
      consumedUnits: nextConsumed,
    };
  });

  const allCompleted = updatedItems.every((item) => item.consumedUnits >= item.totalUnits);

  return {
    ...pkg,
    subItems: updatedItems,
    status: allCompleted ? 'completed' : pkg.status,
  };
}

/**
 * 중도 해지 시 잔여 선수금 부채 기준 정당 환불액(공정위 위약금 10% 공제)을 산출합니다.
 */
export function calculatePackageCancellationRefund(
  pkg: SoldPackageContract,
  penaltyRate: number = 0.1
): {
  totalPaid: number;
  recognizedRevenue: number;
  unearnedLiability: number;
  penaltyFee: number;
  refundAmount: number;
} {
  const { totalRecognizedRevenue, remainingUnearnedLiability } = calculatePackageRealization(pkg);
  const penaltyFee = Math.round(pkg.totalPackagePrice * penaltyRate);
  const refundAmount = Math.max(0, remainingUnearnedLiability - penaltyFee);

  return {
    totalPaid: pkg.totalPackagePrice,
    recognizedRevenue: totalRecognizedRevenue,
    unearnedLiability: remainingUnearnedLiability,
    penaltyFee,
    refundAmount,
  };
}

/**
 * 매장 전체 활성 패키지 계약의 총 선수금 부채 및 실현 매출 총액을 집계합니다.
 */
export function summarizeStoreLiabilityPortfolio(packages: SoldPackageContract[]): {
  totalSoldVolume: number;
  totalCumulativeRecognizedRevenue: number;
  totalCurrentUnearnedLiability: number; // 매장의 실질 선수금 부채 총액
  overallRealizationRatePercent: number;
} {
  let totalSoldVolume = 0;
  let totalCumulativeRecognizedRevenue = 0;
  let totalCurrentUnearnedLiability = 0;

  for (const pkg of packages) {
    if (pkg.status === 'cancelled') continue;
    const m = calculatePackageRealization(pkg);
    totalSoldVolume += pkg.totalPackagePrice;
    totalCumulativeRecognizedRevenue += m.totalRecognizedRevenue;
    totalCurrentUnearnedLiability += m.remainingUnearnedLiability;
  }

  const overallRealizationRatePercent = totalSoldVolume > 0
    ? Math.round((totalCumulativeRecognizedRevenue / totalSoldVolume) * 100)
    : 0;

  return {
    totalSoldVolume,
    totalCumulativeRecognizedRevenue,
    totalCurrentUnearnedLiability,
    overallRealizationRatePercent,
  };
}
