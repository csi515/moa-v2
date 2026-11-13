export type EquipmentUrgencyLevel = 'good' | 'due_soon' | 'overdue' | 'breakdown';

export interface EquipmentAsset {
  id: string;
  name: string; // 예: "필라테스 리포머 1호기", "에스프레소 머신 라마르조코", "정비 리프트 1번"
  category: string; // "fitness", "cafe", "auto", "facility", "rnd_lab"
  purchaseCost: number; // 취득 원가 (예: 5,000,000원)
  acquisitionCost?: number; // 취득 자산가격 (호환 별칭)
  assetTagNumber?: string; // 사내 자산번호 (예: RND-2024-SEM01)
  calibrationIntervalDays?: number; // 정기 점검/교정 주기 (일 단위)
  usefulLifeMonths: number; // 내용연수 (개월 수, 예: 60개월 = 5년)
  installedDate: string; // ISO
  lastMaintenanceDate: string; // ISO
  maintenanceIntervalMonths: number; // 정기 점검/부품 교체 주기 (개월)
  cumulativeRepairCost: number; // 누적 수리 및 유지보수 비용
  status: EquipmentUrgencyLevel;
  breakdownNotes?: string;
  repairHistories?: EquipmentRepairRecord[];
}

export interface RepairVsReplaceDecision {
  currentBookValue: number; // 잔존 장부가액 (정액법)
  depreciationMonthsElapsed: number; // 경과 개월 수
  repairCostRatioPercent: number; // 누적 수리비 / 취득원가 비율 (%)
  recommendation: 'maintain_repair' | 'recommend_replacement'; // 수리 권장 vs 신규 교체 권장
  recommendationReason: string;
}

export interface MonthlyAssetDepreciationItem {
  assetId: string;
  name: string;
  purchaseCost: number;
  usefulLifeMonths: number;
  monthsElapsed: number;
  monthlyDepreciation: number;
  bookValueAfterMonth: number;
  isFullyDepreciated: boolean;
}

export interface MonthlyDepreciationReport {
  periodYearMonth: string; // YYYY-MM
  totalDepreciationExpense: number; // 당월 총 감가상각비
  activeAssetsCount: number; // 상각 대상 활성 자산 수
  items: MonthlyAssetDepreciationItem[];
}

/**
 * 정액법 감가상각 및 누적 수리비 비율을 계산하여 수리 vs 신규 교체 판정을 내립니다.
 */
export function evaluateRepairVsReplaceDecision(
  asset: EquipmentAsset,
  asOfDate: string = new Date(Date.now()).toISOString()
): RepairVsReplaceDecision {
  const startDate = new Date(asset.installedDate);
  const currentDate = new Date(asOfDate);
  const monthsElapsed = Math.max(
    0,
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth())
  );

  // 정액법 감가상각 (잔존가치 10% 가정)
  const salvageValue = Math.round(asset.purchaseCost * 0.1);
  const depreciableAmount = asset.purchaseCost - salvageValue;
  const monthlyDepreciation = depreciableAmount / Math.max(1, asset.usefulLifeMonths);

  const accumulatedDepreciation = Math.min(
    depreciableAmount,
    Math.round(monthlyDepreciation * monthsElapsed)
  );
  const currentBookValue = Math.max(
    salvageValue,
    asset.purchaseCost - accumulatedDepreciation
  );

  const repairRatio = Math.round((asset.cumulativeRepairCost / asset.purchaseCost) * 100);

  let recommendation: 'maintain_repair' | 'recommend_replacement' = 'maintain_repair';
  let reason = '누적 수리비가 취득 원가 대비 안정적인 수준으로 추가 수리 및 유지가 경제적입니다.';

  if (repairRatio >= 50 || monthsElapsed >= asset.usefulLifeMonths) {
    recommendation = 'recommend_replacement';
    reason = `누적 수리비가 취득원가의 ${repairRatio}%에 도달했거나 내용연수(${asset.usefulLifeMonths}개월)가 만료되어 신규 장비 교체가 유리합니다.`;
  }

  return {
    currentBookValue,
    depreciationMonthsElapsed: monthsElapsed,
    repairCostRatioPercent: repairRatio,
    recommendation,
    recommendationReason: reason,
  };
}

/**
 * 다음 정기 점검 기한을 바탕으로 점검 긴급도를 평가합니다.
 */
export function evaluateEquipmentUrgency(
  asset: EquipmentAsset,
  asOfDate: string = new Date(Date.now()).toISOString()
): EquipmentUrgencyLevel {
  if (asset.status === 'breakdown') return 'breakdown';

  const lastMaint = new Date(asset.lastMaintenanceDate).getTime();
  const nextDueDate = lastMaint + asset.maintenanceIntervalMonths * 30.4375 * 24 * 3600 * 1000;
  const now = new Date(asOfDate).getTime();

  const daysLeft = Math.round((nextDueDate - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 14) return 'due_soon';
  return 'good';
}

/**
 * 직원이 현장 태블릿에서 기구 고장을 즉각 신고 접수합니다.
 */
export function reportEquipmentBreakdown(
  asset: EquipmentAsset,
  notes: string
): EquipmentAsset {
  return {
    ...asset,
    status: 'breakdown',
    breakdownNotes: notes.trim(),
  };
}

/**
 * 사업장에 등록된 모든 활성 장비의 당월 정액법 감가상각비를 계산하고 보고서를 집계합니다.
 */
export function calculateMonthlyDepreciationReport(
  assets: EquipmentAsset[],
  targetYearMonth: string // YYYY-MM
): MonthlyDepreciationReport {
  const [yearStr, monthStr] = targetYearMonth.split('-');
  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10);

  let totalExpense = 0;
  let activeCount = 0;
  const items: MonthlyAssetDepreciationItem[] = [];

  for (const asset of assets) {
    const installDate = new Date(asset.installedDate);
    const installYear = installDate.getFullYear();
    const installMonth = installDate.getMonth() + 1; // 1-12

    // 취득 이전 월인 경우 스킵
    const monthsSinceInstall = (targetYear - installYear) * 12 + (targetMonth - installMonth);
    if (monthsSinceInstall < 0) continue;

    // 정액법 감가상각 (잔존가치 10% 가정)
    const salvageValue = Math.round(asset.purchaseCost * 0.1);
    const depreciableAmount = asset.purchaseCost - salvageValue;
    const monthlyDepreciation = Math.round(depreciableAmount / Math.max(1, asset.usefulLifeMonths));

    // 상각 경과 개월
    const isFullyDepreciated = monthsSinceInstall >= asset.usefulLifeMonths;
    const effectiveMonthlyAmount = isFullyDepreciated ? 0 : monthlyDepreciation;

    const accumulated = Math.min(
      depreciableAmount,
      monthlyDepreciation * (monthsSinceInstall + 1)
    );
    const bookValueAfterMonth = Math.max(salvageValue, asset.purchaseCost - accumulated);

    if (!isFullyDepreciated) {
      activeCount++;
      totalExpense += effectiveMonthlyAmount;
    }

    items.push({
      assetId: asset.id,
      name: asset.name,
      purchaseCost: asset.purchaseCost,
      usefulLifeMonths: asset.usefulLifeMonths,
      monthsElapsed: monthsSinceInstall + 1,
      monthlyDepreciation: effectiveMonthlyAmount,
      bookValueAfterMonth,
      isFullyDepreciated,
    });
  }

  return {
    periodYearMonth: targetYearMonth,
    totalDepreciationExpense: totalExpense,
    activeAssetsCount: activeCount,
    items,
  };
}

/**
 * 감가상각 보고서를 바탕으로 `ledger_simple` 손익계산서에 자동 반영할 비용(Expense) 분개 전표를 생성합니다.
 */
export function createDepreciationLedgerEntryPayload(
  report: MonthlyDepreciationReport
): {
  type: 'EXPENSE';
  method: 'OTHER';
  amount: number;
  description: string;
  timestamp: string;
} {
  const [year, month] = report.periodYearMonth.split('-');
  // 해당 월 말일로 타임스탬프 설정
  const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  const dateStr = `${report.periodYearMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.000Z`;

  return {
    type: 'EXPENSE',
    method: 'OTHER',
    amount: report.totalDepreciationExpense,
    description: `[감가상각비] ${report.periodYearMonth} 고정자산 감가상각 분개 (${report.activeAssetsCount}개 자산)`,
    timestamp: dateStr,
  };
}

export interface EquipmentRepairRecord {
  incidentId: string;
  repairDate: string; // ISO / YYYY-MM-DD
  vendorName: string; // 수리 업체 / 엔지니어
  technicianName?: string;
  replacedParts?: string[]; // 교체 부품 목록
  repairCost: number; // 수리 비용 (원)
  downtimeHours: number; // 가동 중단 시간 (Downtime 시간)
  repairNotes: string;
}

/**
 * 설비 고장 및 수리 이력을 영구 보존하고 누적 수리비 및 장비 상태를 갱신합니다.
 */
export function recordEquipmentRepairIncident(
  asset: EquipmentAsset,
  repair: EquipmentRepairRecord
): EquipmentAsset {
  const nextRepairs = [...(asset.repairHistories || []), repair];
  const nextCumulativeCost = asset.cumulativeRepairCost + repair.repairCost;

  return {
    ...asset,
    cumulativeRepairCost: nextCumulativeCost,
    status: 'good', // 수리 완료 후 정상 상태 복귀
    breakdownNotes: undefined,
    lastMaintenanceDate: repair.repairDate,
    repairHistories: nextRepairs,
  };
}

