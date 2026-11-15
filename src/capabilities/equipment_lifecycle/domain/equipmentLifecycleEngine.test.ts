import assert from 'node:assert';
import {
  evaluateRepairVsReplaceDecision,
  evaluateEquipmentUrgency,
  reportEquipmentBreakdown,
  calculateMonthlyDepreciationReport,
  createDepreciationLedgerEntryPayload,
  EquipmentAsset,
} from './equipmentLifecycleEngine';

console.log('--- Testing equipmentLifecycleEngine ---');

// Test 1: Straight-line depreciation and repair vs replace recommendation
const studioReformer: EquipmentAsset = {
  id: 'eq_1',
  name: '캐딜락 리포머 1호',
  category: 'fitness',
  purchaseCost: 6000000,
  usefulLifeMonths: 60, // 5 years
  installedDate: '2024-10-14T00:00:00Z', // 24 months elapsed
  lastMaintenanceDate: '2026-08-14T00:00:00Z',
  maintenanceIntervalMonths: 6,
  cumulativeRepairCost: 1200000, // 20% of cost
  status: 'good',
};

const decision1 = evaluateRepairVsReplaceDecision(studioReformer, '2026-10-14T00:00:00Z');
assert.strictEqual(decision1.depreciationMonthsElapsed, 24);
assert.strictEqual(decision1.repairCostRatioPercent, 20);
assert.strictEqual(decision1.recommendation, 'maintain_repair');
console.log('✅ Test 1 passed: Depreciation and maintain recommendation');

// Test 2: Heavy repair costs leading to replacement recommendation
const oldEspressoMachine: EquipmentAsset = {
  id: 'eq_2',
  name: '에스프레소 머신',
  category: 'cafe',
  purchaseCost: 10000000,
  usefulLifeMonths: 48,
  installedDate: '2022-01-01T00:00:00Z',
  lastMaintenanceDate: '2025-01-01T00:00:00Z',
  maintenanceIntervalMonths: 3,
  cumulativeRepairCost: 5500000, // 55% of cost
  status: 'good',
};

const decision2 = evaluateRepairVsReplaceDecision(oldEspressoMachine, '2026-10-14T00:00:00Z');
assert.strictEqual(decision2.repairCostRatioPercent, 55);
assert.strictEqual(decision2.recommendation, 'recommend_replacement');
console.log('✅ Test 2 passed: High repair cost triggers replacement recommendation');

// Test 3: Maintenance urgency check and breakdown reporting
const urgencyDue = evaluateEquipmentUrgency(oldEspressoMachine, '2026-10-14T00:00:00Z');
assert.strictEqual(urgencyDue, 'overdue');

const reported = reportEquipmentBreakdown(studioReformer, '리포머 3번 스프링 파손 위험');
assert.strictEqual(reported.status, 'breakdown');
assert.strictEqual(reported.breakdownNotes, '리포머 3번 스프링 파손 위험');
console.log('✅ Test 3 passed: Overdue maintenance detection and breakdown reporting');

// Test 4: 월별 감가상각비 집계 및 간이 손익계산서(ledger_simple) 분개 전표 생성
const assets = [studioReformer, oldEspressoMachine];
const depReport = calculateMonthlyDepreciationReport(assets, '2026-10');

// 리포머: (6,000,000 - 600,000) / 60개월 = 월 90,000원 (상각 진행 중)
// 에스프레소 머신: 2022-01 설치, 내용연수 48개월 -> 2026-01 만료로 상각 완료 (0원)
assert.strictEqual(depReport.periodYearMonth, '2026-10');
assert.strictEqual(depReport.activeAssetsCount, 1);
assert.strictEqual(depReport.totalDepreciationExpense, 90000);

const reformerItem = depReport.items.find((it) => it.assetId === 'eq_1')!;
assert.strictEqual(reformerItem.monthlyDepreciation, 90000);
assert.strictEqual(reformerItem.isFullyDepreciated, false);

const espressoItem = depReport.items.find((it) => it.assetId === 'eq_2')!;
assert.strictEqual(espressoItem.monthlyDepreciation, 0);
assert.strictEqual(espressoItem.isFullyDepreciated, true);

// 손익 분개 전표 페이로드 검증
const ledgerPayload = createDepreciationLedgerEntryPayload(depReport);
assert.strictEqual(ledgerPayload.type, 'EXPENSE');
assert.strictEqual(ledgerPayload.method, 'OTHER');
assert.strictEqual(ledgerPayload.amount, 90000);
assert.ok(ledgerPayload.description.includes('고정자산 감가상각'));
assert.strictEqual(ledgerPayload.timestamp, '2026-10-31T23:59:59.000Z');
console.log('✅ Test 4 passed: Monthly depreciation reporting and ledger expense payload creation');

// Test 5: 연구 설비 자산 마스터(자산번호, 교정주기) 및 수리/고장 이력 누적 영구 보존
const { recordEquipmentRepairIncident } = await import('./equipmentLifecycleEngine');
const semAsset: EquipmentAsset = {
  id: 'eq_sem_01',
  name: 'FE-SEM 전계방출형 주사전자현미경',
  category: 'rnd_lab',
  purchaseCost: 150000000,
  assetTagNumber: 'RND-2024-SEM01',
  calibrationIntervalDays: 180,
  usefulLifeMonths: 120, // 10년
  installedDate: '2024-01-01',
  lastMaintenanceDate: '2026-04-01',
  maintenanceIntervalMonths: 6,
  cumulativeRepairCost: 2000000,
  status: 'breakdown',
  breakdownNotes: '전자총 고전압 공급 모듈 결함',
};

const repairRecord = {
  incidentId: 'inc-202610-01',
  repairDate: '2026-10-18',
  vendorName: '한국자이스정밀',
  technicianName: '박엔지니어',
  replacedParts: ['FEG Gun High Voltage Module (HV-200)'],
  repairCost: 5500000,
  downtimeHours: 48,
  repairNotes: '고전압 모듈 교체 및 진공도 재교정 완료 (정상 가동 복귀)',
};

const repairedSem = recordEquipmentRepairIncident(semAsset, repairRecord);
assert.strictEqual(repairedSem.cumulativeRepairCost, 7500000);
assert.strictEqual(repairedSem.status, 'good');
assert.strictEqual(repairedSem.breakdownNotes, undefined);
assert.strictEqual(repairedSem.lastMaintenanceDate, '2026-10-18');
assert.strictEqual(repairedSem.repairHistories?.length, 1);
assert.strictEqual(repairedSem.repairHistories[0].downtimeHours, 48);
assert.strictEqual(repairedSem.repairHistories[0].replacedParts?.[0], 'FEG Gun High Voltage Module (HV-200)');
console.log('✅ Test 5 passed: R&D equipment repair history and downtime tracking');

console.log('🎉 All equipmentLifecycleEngine tests passed!');

