/**
 * 미용·시술·케어 히스토리 차트 엔진 (Pure Function Domain)
 *
 * 대상: 헤어샵 염색 넘버/커트, 네일아트 컬러, 피부/속눈썹, 펫 미용
 * 순수 로직:
 *  1. 시술 메타데이터(약재/색상/전후사진URL) 정규화
 *  2. 시술 주기 기반 재방문 예정일 판정식
 */

export interface RawTreatmentInput {
  customerId: string;
  practitionerId: string;
  category: string; // 헤어, 네일, 피부, 펫미용 등
  formulaNotes?: string; // 염색약 배합 비율, 사용 젤 컬러 번호 등
  colorCodes?: string[]; // e.g. ["#8B0000", "7-45"]
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
  price?: number;
  performedAt?: string; // ISO String
}

export interface NormalizedTreatmentEntry {
  id: string;
  customerId: string;
  practitionerId: string;
  category: string;
  formulaSummary: string;
  colorCodes: string[];
  photoUrls: { before: string[]; after: string[] };
  price: number;
  performedDate: string; // YYYY-MM-DD
  performedAt: string;
}

export function normalizeTreatmentEntry(
  id: string,
  raw: RawTreatmentInput
): NormalizedTreatmentEntry {
  const ts = raw.performedAt ?? new Date().toISOString();
  const dateStr = ts.slice(0, 10);

  const cleanColors = (raw.colorCodes ?? [])
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const beforePhotos = (raw.beforePhotoUrls ?? []).filter((u) => u.trim().length > 0);
  const afterPhotos = (raw.afterPhotoUrls ?? []).filter((u) => u.trim().length > 0);

  return {
    id,
    customerId: raw.customerId,
    practitionerId: raw.practitionerId,
    category: raw.category.trim() || '일반 시술',
    formulaSummary: raw.formulaNotes?.trim() ?? '특이사항 없음',
    colorCodes: cleanColors,
    photoUrls: { before: beforePhotos, after: afterPhotos },
    price: Math.max(0, raw.price ?? 0),
    performedDate: dateStr,
    performedAt: ts,
  };
}

export interface NextVisitPredictionResult {
  lastPerformedDate: string;
  cycleWeeks: number;
  targetVisitDate: string; // YYYY-MM-DD
  daysRemaining: number;
  isDue: boolean;
  isOverdue: boolean;
}

export function predictNextVisitDate(params: {
  lastPerformedDate: string; // YYYY-MM-DD
  cycleWeeks: number; // e.g. 4 for 4주 주기
  currentDate: string; // YYYY-MM-DD
}): NextVisitPredictionResult {
  const { lastPerformedDate, cycleWeeks, currentDate } = params;

  const lastMs = new Date(lastPerformedDate).getTime();
  const curMs = new Date(currentDate).getTime();

  // cycleWeeks * 7일 후
  const cycleDays = cycleWeeks * 7;
  const targetMs = lastMs + cycleDays * 24 * 3600 * 1000;
  const targetVisitDate = new Date(targetMs).toISOString().slice(0, 10);

  const daysRemaining = Math.ceil((targetMs - curMs) / (1000 * 3600 * 24));
  const isOverdue = daysRemaining < 0;
  // 예정일 3일 전부터 방문 도래(isDue)로 판정
  const isDue = daysRemaining <= 3;

  return {
    lastPerformedDate,
    cycleWeeks,
    targetVisitDate,
    daysRemaining,
    isDue,
    isOverdue,
  };
}
