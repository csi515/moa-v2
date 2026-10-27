/**
/**
 * 품질 검사 (QA/QC) 도메인 순수 함수 엔진
 *
 * 공정/제품별 규격(Min/Max/Target)에 대한 샘플 측정치 공차 판정,
 * 불량률, 평균, 표준편차 및 공정능력지수(Cpk) 산출
 */

export type InspectionProcessStage = 'inbound' | 'in_process' | 'final' | 'outgoing';
export type QualityJudgment = 'pass' | 'fail' | 'conditional_pass';

export interface InspectionStandard {
  id: string;
  itemName: string;
  processStage: InspectionProcessStage;
  inspectionItem: string;
  unit: string;
  targetValue?: number | null;
  minThreshold?: number | null;
  maxThreshold?: number | null;
  sampleSize: number;
}

export interface SampleEvaluationResult {
  sampleValues: number[];
  count: number;
  mean: number;
  min: number;
  max: number;
  defectCount: number;
  defectRatePercent: number;
  judgment: QualityJudgment;
  cpk?: number; // 공정능력지수
}

/**
 * 샘플 측정값 배열을 규격 기준에 대조하여 통계 및 합격/불합격 판정
 */
export function evaluateInspectionSamples(
  values: number[],
  standard: Pick<InspectionStandard, 'minThreshold' | 'maxThreshold' | 'targetValue'>
): SampleEvaluationResult {
  if (values.length === 0) {
    return {
      sampleValues: [],
      count: 0,
      mean: 0,
      min: 0,
      max: 0,
      defectCount: 0,
      defectRatePercent: 0,
      judgment: 'pass',
    };
  }

  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / count).toFixed(3));
  const min = Math.min(...values);
  const max = Math.max(...values);

  let defectCount = 0;
  for (const v of values) {
    const isBelowMin = standard.minThreshold !== undefined && standard.minThreshold !== null && v < standard.minThreshold;
    const isAboveMax = standard.maxThreshold !== undefined && standard.maxThreshold !== null && v > standard.maxThreshold;
    if (isBelowMin || isAboveMax) {
      defectCount++;
    }
  }

  const defectRatePercent = Number(((defectCount / count) * 100).toFixed(1));

  let judgment: QualityJudgment = 'pass';
  if (defectCount > 0) {
    judgment = 'fail';
  }

  // 공정능력지수 (Cpk) 계산 (샘플이 2개 이상이고 표준편차가 유효할 때)
  let cpk: number | undefined;
  if (count >= 2 && standard.minThreshold !== undefined && standard.maxThreshold !== undefined && standard.minThreshold !== null && standard.maxThreshold !== null) {
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1);
    const stdev = Math.sqrt(variance);

    if (stdev > 0) {
      const cpu = (standard.maxThreshold - mean) / (3 * stdev);
      const cpl = (mean - standard.minThreshold) / (3 * stdev);
      cpk = Number(Math.min(cpu, cpl).toFixed(2));
    }
  }

  return {
    sampleValues: values,
    count,
    mean,
    min,
    max,
    defectCount,
    defectRatePercent,
    judgment,
    cpk,
  };
}

/**
 * ISO 9001 8.7항 / 10.2항: 품질 검사 불합격 시 CAPA 시정조치 티켓 자동 생성 연계
 */
export interface QualityCapaDraft {
  sourceType: 'quality_defect';
  sourceId: string;
  title: string;
  initialStage: 'reported';
  summary: {
    itemName: string;
    inspectionItem: string;
    defectRatePercent: number;
    sampleCount: number;
    defectCount: number;
  };
}

export function createCapaFromInspectionFailure(
  inspectionId: string,
  standard: Pick<InspectionStandard, 'itemName' | 'inspectionItem'>,
  result: SampleEvaluationResult
): QualityCapaDraft | null {
  if (result.judgment !== 'fail') {
    return null;
  }

  return {
    sourceType: 'quality_defect',
    sourceId: inspectionId,
    title: `[품질 부적합 시정요구] ${standard.itemName} - ${standard.inspectionItem} (불량률 ${result.defectRatePercent}%)`,
    initialStage: 'reported',
    summary: {
      itemName: standard.itemName,
      inspectionItem: standard.inspectionItem,
      defectRatePercent: result.defectRatePercent,
      sampleCount: result.count,
      defectCount: result.defectCount,
    },
  };
}

