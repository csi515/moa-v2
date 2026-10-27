export type VendorTier = 'A_EXCELLENT' | 'B_GOOD' | 'C_AVERAGE' | 'D_PROBATION';

export interface VendorEvaluationRecord {
  id: string;
  vendorCode: string;
  vendorName: string;
  category: string;
  deliveryPunctualityRate: number; // 0 ~ 100%
  defectRate: number; // 0 ~ 100%
  priceCompetitivenessScore: number; // 1 ~ 5
  csResponsivenessScore: number; // 1 ~ 5
  evaluationPeriod: string; // '2026-Q3'
}

export function calculateCompositeScore(
  punctualityRate: number,
  defectRate: number,
  priceScore: number,
  csScore: number
): number {
  // 1. 납기 준수 점수 (35% 가중치, 100점 만점)
  const punctualityPart = Math.max(0, Math.min(100, punctualityRate)) * 0.35;

  // 2. 무결점 품질 점수 (35% 가중치, 100점 만점)
  const qualityRate = Math.max(0, 100 - Math.max(0, defectRate));
  const qualityPart = qualityRate * 0.35;

  // 3. 단가 경쟁력 (15% 가중치, 5점 만점 -> 100점 환산)
  const pricePart = (Math.max(1, Math.min(5, priceScore)) / 5) * 100 * 0.15;

  // 4. CS 응대 (15% 가중치, 5점 만점 -> 100점 환산)
  const csPart = (Math.max(1, Math.min(5, csScore)) / 5) * 100 * 0.15;

  const total = punctualityPart + qualityPart + pricePart + csPart;
  return Math.round(total * 10) / 10;
}

export function determineVendorTier(compositeScore: number): VendorTier {
  if (compositeScore >= 90) return 'A_EXCELLENT';
  if (compositeScore >= 80) return 'B_GOOD';
  if (compositeScore >= 70) return 'C_AVERAGE';
  return 'D_PROBATION';
}

export function filterProbationVendors(
  records: VendorEvaluationRecord[]
): VendorEvaluationRecord[] {
  return records.filter((r) => {
    const score = calculateCompositeScore(
      r.deliveryPunctualityRate,
      r.defectRate,
      r.priceCompetitivenessScore,
      r.csResponsivenessScore
    );
    return determineVendorTier(score) === 'D_PROBATION';
  });
}
