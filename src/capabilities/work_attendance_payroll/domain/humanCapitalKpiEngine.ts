/**
 * ISO 30414 (인적자본 보고 지침) 4대 핵심 지표 산출 엔진 (Pure Domain Engine)
 *
 * 규격: ISO 30414 Human Resource Management - Guidelines for internal and external human capital reporting
 *
 * 4대 핵심 클러스터:
 * 1. Workforce Availability (인력 가용성: 총 근로시간, 연장근로율, 결근율)
 * 2. Productivity & Performance (생산성/성과: 1인당 매출 기여도, MBO 달성률 분포)
 * 3. Recruitment & Turnover (이직/유지: 입사율, 이직률, 유지율)
 * 4. Competence Development (역량 개발: 1인당 평균 교육훈련 시간, 유효성 달성률)
 */

import {
  type TrainingSessionRecord,
  calculateTrainingMetrics,
} from './workAttendancePayrollEngine';
import { calculateGradeFromScore } from '@/capabilities/mbo/domain/mboEngine';

export interface WorkforceAvailabilityInput {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalScheduledDays: number;
  totalAbsenceDays: number;
}

export interface WorkforceAvailabilityMetrics {
  totalWorkedHours: number;
  overtimeRatePercent: number;
  absenteeismRatePercent: number;
}

export interface ProductivityPerformanceInput {
  totalRevenue: number;
  totalEmployeeCount: number;
  mboScores: readonly { staffId: string; department: string; score: number }[];
}

export interface ProductivityPerformanceMetrics {
  revenuePerEmployee: number;
  departmentMboAverage: Record<string, number>;
  mboGradeDistribution: {
    S: number; // 90 ~ 100점
    A: number; // 80 ~ 89점
    B: number; // 70 ~ 79점
    C: number; // 60 ~ 69점
    D: number; // 60점 미만
  };
}

export interface TurnoverRetentionInput {
  startPeriodEmployeeCount: number;
  endPeriodEmployeeCount: number;
  newHiresCount: number;
  terminationsCount: number;
}

export interface TurnoverRetentionMetrics {
  averageEmployeeCount: number;
  recruitmentRatePercent: number;
  turnoverRatePercent: number;
  retentionRatePercent: number;
}

export interface Iso30414HumanCapitalReport {
  reportingPeriod: string;
  organizationId: string;
  availability: WorkforceAvailabilityMetrics;
  productivity: ProductivityPerformanceMetrics;
  turnover: TurnoverRetentionMetrics;
  competence: {
    totalTrainedHours: number;
    averageHoursPerStaff: number;
    completionRatePercent: number;
    effectivenessRatePercent: number;
  };
  generatedAt: string;
}

/**
 * 1. 인력 가용성 지표 산출 (순수 함수)
 */
export function calculateWorkforceAvailability(
  input: WorkforceAvailabilityInput
): WorkforceAvailabilityMetrics {
  const totalWorkedHours = input.totalRegularHours + input.totalOvertimeHours;
  const overtimeRatePercent =
    input.totalRegularHours > 0
      ? Math.round((input.totalOvertimeHours / input.totalRegularHours) * 1000) / 10
      : 0;

  const absenteeismRatePercent =
    input.totalScheduledDays > 0
      ? Math.round((input.totalAbsenceDays / input.totalScheduledDays) * 1000) / 10
      : 0;

  return {
    totalWorkedHours,
    overtimeRatePercent,
    absenteeismRatePercent,
  };
}

/**
 * 2. 생산성 및 성과 지표 산출 (순수 함수)
 */
export function calculateProductivityMetrics(
  input: ProductivityPerformanceInput
): ProductivityPerformanceMetrics {
  const revenuePerEmployee =
    input.totalEmployeeCount > 0
      ? Math.round(input.totalRevenue / input.totalEmployeeCount)
      : 0;

  // 부서별 평균 MBO 점수 계산
  const deptSums: Record<string, { sum: number; count: number }> = {};
  const mboGradeDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };

  for (const item of input.mboScores) {
    if (!deptSums[item.department]) {
      deptSums[item.department] = { sum: 0, count: 0 };
    }
    deptSums[item.department].sum += item.score;
    deptSums[item.department].count += 1;

    const grade = calculateGradeFromScore(item.score);
    if (grade in mboGradeDistribution) {
      mboGradeDistribution[grade]++;
    }
  }

  const departmentMboAverage: Record<string, number> = {};
  for (const [dept, data] of Object.entries(deptSums)) {
    departmentMboAverage[dept] =
      data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0;
  }

  return {
    revenuePerEmployee,
    departmentMboAverage,
    mboGradeDistribution,
  };
}

/**
 * 3. 이직 및 인력 유지율 산출 (순수 함수)
 */
export function calculateTurnoverMetrics(
  input: TurnoverRetentionInput
): TurnoverRetentionMetrics {
  const averageEmployeeCount =
    (input.startPeriodEmployeeCount + input.endPeriodEmployeeCount) / 2;

  const recruitmentRatePercent =
    averageEmployeeCount > 0
      ? Math.round((input.newHiresCount / averageEmployeeCount) * 1000) / 10
      : 0;

  const turnoverRatePercent =
    averageEmployeeCount > 0
      ? Math.round((input.terminationsCount / averageEmployeeCount) * 1000) / 10
      : 0;

  const retentionRatePercent = Math.max(0, Math.round((100 - turnoverRatePercent) * 10) / 10);

  return {
    averageEmployeeCount,
    recruitmentRatePercent,
    turnoverRatePercent,
    retentionRatePercent,
  };
}

/**
 * 4. ISO 30414 통합 인적자본 보고서 종합 집계 (순수 함수)
 */
export function generateIso30414Report(params: {
  reportingPeriod: string;
  organizationId: string;
  availabilityInput: WorkforceAvailabilityInput;
  productivityInput: ProductivityPerformanceInput;
  turnoverInput: TurnoverRetentionInput;
  trainingRecords: readonly TrainingSessionRecord[];
}): Iso30414HumanCapitalReport {
  const availability = calculateWorkforceAvailability(params.availabilityInput);
  const productivity = calculateProductivityMetrics(params.productivityInput);
  const turnover = calculateTurnoverMetrics(params.turnoverInput);
  const trainingMetrics = calculateTrainingMetrics(
    params.trainingRecords,
    params.productivityInput.totalEmployeeCount
  );

  return {
    reportingPeriod: params.reportingPeriod,
    organizationId: params.organizationId,
    availability,
    productivity,
    turnover,
    competence: {
      totalTrainedHours: trainingMetrics.totalTrainedHours,
      averageHoursPerStaff: trainingMetrics.averageHoursPerStaff,
      completionRatePercent: trainingMetrics.completionRatePercent,
      effectivenessRatePercent: trainingMetrics.effectivenessRatePercent,
    },
    generatedAt: new Date().toISOString(),
  };
}
