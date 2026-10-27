import assert from 'node:assert/strict';
import {
  calculateWorkforceAvailability,
  calculateProductivityMetrics,
  calculateTurnoverMetrics,
  generateIso30414Report,
} from './humanCapitalKpiEngine';

console.log('--- Testing humanCapitalKpiEngine (ISO 30414) ---');

// 1. Workforce Availability Test
{
  const availability = calculateWorkforceAvailability({
    totalRegularHours: 1600,
    totalOvertimeHours: 160, // 10%
    totalScheduledDays: 200,
    totalAbsenceDays: 4, // 2%
  });

  assert.equal(availability.totalWorkedHours, 1760);
  assert.equal(availability.overtimeRatePercent, 10.0);
  assert.equal(availability.absenteeismRatePercent, 2.0);
  console.log('✅ Test 1 passed: Workforce Availability metrics');
}

// 2. Productivity & Performance Test
{
  const productivity = calculateProductivityMetrics({
    totalRevenue: 500_000_000,
    totalEmployeeCount: 10,
    mboScores: [
      { staffId: 'S1', department: '생산팀', score: 95 }, // S
      { staffId: 'S2', department: '생산팀', score: 85 }, // A
      { staffId: 'S3', department: '영업팀', score: 80 }, // A
      { staffId: 'S4', department: '영업팀', score: 70 }, // B
      { staffId: 'S5', department: '품질팀', score: 55 }, // D
    ],
  });

  assert.equal(productivity.revenuePerEmployee, 50_000_000);
  assert.equal(productivity.departmentMboAverage['생산팀'], 90.0);
  assert.equal(productivity.departmentMboAverage['영업팀'], 75.0);
  assert.equal(productivity.departmentMboAverage['품질팀'], 55.0);
  assert.equal(productivity.mboGradeDistribution.S, 1);
  assert.equal(productivity.mboGradeDistribution.A, 2);
  assert.equal(productivity.mboGradeDistribution.B, 1);
  assert.equal(productivity.mboGradeDistribution.C, 0);
  assert.equal(productivity.mboGradeDistribution.D, 1);
  console.log('✅ Test 2 passed: Productivity and MBO score distribution metrics');
}

// 3. Turnover & Retention Test
{
  const turnover = calculateTurnoverMetrics({
    startPeriodEmployeeCount: 20,
    endPeriodEmployeeCount: 24, // 평균 22명
    newHiresCount: 6,
    terminationsCount: 2,
  });

  assert.equal(turnover.averageEmployeeCount, 22);
  // (6 / 22) * 100 = 27.3%
  assert.equal(turnover.recruitmentRatePercent, 27.3);
  // (2 / 22) * 100 = 9.1%
  assert.equal(turnover.turnoverRatePercent, 9.1);
  // 유지율: 100 - 9.1 = 90.9%
  assert.equal(turnover.retentionRatePercent, 90.9);
  console.log('✅ Test 3 passed: Turnover and retention rate metrics');
}

// 4. ISO 30414 Comprehensive Report Test
{
  const report = generateIso30414Report({
    reportingPeriod: '2026-Q3',
    organizationId: 'ORG-MFG-01',
    availabilityInput: {
      totalRegularHours: 3200,
      totalOvertimeHours: 320,
      totalScheduledDays: 400,
      totalAbsenceDays: 8,
    },
    productivityInput: {
      totalRevenue: 1_000_000_000,
      totalEmployeeCount: 20,
      mboScores: [{ staffId: 'S1', department: '제조', score: 92 }],
    },
    turnoverInput: {
      startPeriodEmployeeCount: 19,
      endPeriodEmployeeCount: 21,
      newHiresCount: 3,
      terminationsCount: 1,
    },
    trainingRecords: [
      {
        id: 'TR-1',
        organizationId: 'ORG-MFG-01',
        title: 'Q3 안전보건 교육',
        trainingType: 'safety_health',
        plannedDate: '2026-08-01',
        completedDate: '2026-08-01',
        targetStaffIds: ['S1', 'S2'],
        attendedStaffIds: ['S1', 'S2'],
        trainerName: '안전팀',
        durationHours: 3,
        trainingStatus: 'completed',
        effectivenessEvaluation: {
          evaluatorStaffId: 'MGR-1',
          evaluatedAt: '2026-08-01T17:00:00Z',
          score: 80,
          result: 'effective',
          criteriaMet: true,
        },
      },
    ],
  });

  assert.equal(report.reportingPeriod, '2026-Q3');
  assert.equal(report.organizationId, 'ORG-MFG-01');
  assert.equal(report.availability.overtimeRatePercent, 10.0);
  assert.equal(report.productivity.revenuePerEmployee, 50_000_000);
  assert.equal(report.competence.totalTrainedHours, 6);
  assert.equal(report.competence.averageHoursPerStaff, 0.3);
  assert.equal(report.competence.effectivenessRatePercent, 100);
  assert.ok(report.generatedAt);
  console.log('✅ Test 4 passed: ISO 30414 comprehensive human capital report generation');
}

console.log('🎉 All humanCapitalKpiEngine tests passed successfully!');
