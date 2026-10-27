import assert from 'node:assert';
import {
  evaluateTemperatureStatus,
  calculateHealthCertStatus,
  calculateDailyHygieneAudit,
  TemperatureRecord,
  HealthCertificateRecord,
  HygieneCheckItem,
} from './hygieneHaccpLogEngine';

console.log('--- Testing hygieneHaccpLogEngine ---');

// Test 1: Temperature status evaluation
const normalFridge = evaluateTemperatureStatus('refrigerator', 3.5);
assert.strictEqual(normalFridge.isAlert, false, '3.5C in fridge is normal');

const warmFridge = evaluateTemperatureStatus('refrigerator', 7.2);
assert.strictEqual(warmFridge.isAlert, true, '7.2C in fridge exceeds 5C threshold');

const normalFreezer = evaluateTemperatureStatus('freezer', -20);
assert.strictEqual(normalFreezer.isAlert, false, '-20C in freezer is normal');

const warmFreezer = evaluateTemperatureStatus('freezer', -14);
assert.strictEqual(warmFreezer.isAlert, true, '-14C in freezer exceeds -18C threshold');
console.log('✅ Test 1 passed: Temperature evaluation for fridge and freezer');

// Test 2: Health certificate D-Day and expiration tiers
const baseDate = '2026-03-15';
const validCert = calculateHealthCertStatus('2026-06-30', baseDate);
assert.strictEqual(validCert.status, 'valid');

const warningCert = calculateHealthCertStatus('2026-03-25', baseDate);
assert.strictEqual(warningCert.status, 'warning'); // D-10
assert.strictEqual(warningCert.dDay, 10);

const expiredCert = calculateHealthCertStatus('2026-03-10', baseDate);
assert.strictEqual(expiredCert.status, 'expired'); // D < 0
console.log('✅ Test 2 passed: Health certificate D-Day and alert levels');

// Test 3: Daily hygiene audit summary
const tempRecords: TemperatureRecord[] = [
  {
    recordId: 't-1',
    unitId: 'f-1',
    unitName: '메인 냉장고',
    unitType: 'refrigerator',
    targetMinTemp: 0,
    targetMaxTemp: 5,
    recordedTemp: 3.2,
    timeSlot: 'morning',
    isAlert: false,
    recordedAt: '09:00',
    recordedBy: '김조리',
  },
  {
    recordId: 't-2',
    unitId: 'f-2',
    unitName: '육류 냉동고',
    unitType: 'freezer',
    targetMinTemp: -25,
    targetMaxTemp: -18,
    recordedTemp: -19.5,
    timeSlot: 'morning',
    isAlert: false,
    recordedAt: '09:05',
    recordedBy: '김조리',
  },
];

const checkItems: HygieneCheckItem[] = [
  { id: 'c-1', category: 'sanitation', task: '칼·도마 구분 사용 및 자외선 소독', isChecked: true },
  { id: 'c-2', category: 'storage', task: '식자재 유통기한 라벨링 및 선입선출', isChecked: true },
  { id: 'c-3', category: 'personal', task: '조리원 위생모·마스크 착용', isChecked: true },
];

const healthCerts: HealthCertificateRecord[] = [
  {
    certId: 'h-1',
    staffId: 's-1',
    staffName: '김조리',
    role: '메인 셰프',
    examDate: '2025-06-01',
    expiryDate: '2026-06-01',
    dDay: 78,
    status: 'valid',
  },
];

const audit = calculateDailyHygieneAudit('2026-03-15', tempRecords, checkItems, healthCerts);
assert.strictEqual(audit.temperatureAlerts, 0);
assert.strictEqual(audit.checklistCompletionRate, 100);
assert.strictEqual(audit.expiringHealthCertCount, 0);
assert.strictEqual(audit.isInspectionReady, true);
console.log('✅ Test 3 passed: Daily hygiene audit summary and inspection readiness');

console.log('🎉 All hygieneHaccpLogEngine tests passed!');
