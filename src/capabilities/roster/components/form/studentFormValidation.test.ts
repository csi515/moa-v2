/**
 * 학생 폼 validation 표현용 — 규칙은 기존 handleSubmit과 동일.
 * 실행: npm run test:student-form-validation
 */
import assert from 'node:assert/strict';
import { newGuardianEntry, type StudentFormData } from './studentFormTypes';
import {
  firstErrorField,
  studentFormSnapshot,
  validateStudentForm,
} from './studentFormValidation';

function blankForm(): StudentFormData {
  return {
    name: '',
    gender: '',
    birthDate: '',
    phone: '',
    school: '',
    grade: '',
    joinDate: '2026-09-24',
    leaveDate: '',
    status: 'active',
    teacherId: '',
    classIds: [],
    level: '바이엘 상',
    billingMode: 'monthly',
    tuitionFee: 180000,
    paymentDay: 10,
    specialNotes: '',
    memo: '',
    address: '',
    usesShuttleService: false,
    pickupAddresses: [
      {
        id: 'pickup-1',
        label: '집',
        address: '',
        shuttleDirection: 'both',
        isDefault: true,
      },
    ],
    checkInPin: '',
    autoGeneratePin: true,
  };
}

function run(): void {
  const labels = { customerLabel: '학생', contactLabel: '보호자' };

  const empty = validateStudentForm({
    formData: blankForm(),
    guardians: [newGuardianEntry(true)],
    isAdultSelf: false,
    showPickupFields: false,
    ...labels,
  });
  assert.equal(empty.name, '필수 항목: 학생 이름을 입력해 주세요');
  assert.ok(empty['guardian-0-name']);
  assert.ok(empty['guardian-0-phone']);
  assert.equal(firstErrorField(empty), 'name');

  const named = blankForm();
  named.name = '김모아';
  const missingParent = validateStudentForm({
    formData: named,
    guardians: [{ ...newGuardianEntry(true), mode: 'existing', existingParentId: '' }],
    isAdultSelf: false,
    showPickupFields: false,
    ...labels,
  });
  assert.equal(missingParent.name, undefined);
  assert.match(missingParent['guardian-0-existing'] ?? '', /기존 보호자/);

  const adult = validateStudentForm({
    formData: named,
    guardians: [newGuardianEntry(true)],
    isAdultSelf: true,
    showPickupFields: false,
    ...labels,
  });
  assert.deepEqual(adult, {});

  const g1 = { ...newGuardianEntry(true), mode: 'new' as const, name: '엄마', phone: '010-1111-1111' };
  const g2 = { ...newGuardianEntry(), mode: 'new' as const, name: '아빠', phone: '010-1111-1111' };
  const dup = validateStudentForm({
    formData: named,
    guardians: [g1, g2],
    isAdultSelf: false,
    showPickupFields: false,
    ...labels,
  });
  assert.match(dup.guardians ?? '', /중복/);

  const shuttle = blankForm();
  shuttle.name = '김모아';
  shuttle.usesShuttleService = true;
  const pickupErr = validateStudentForm({
    formData: shuttle,
    guardians: [g1],
    isAdultSelf: false,
    showPickupFields: true,
    ...labels,
  });
  assert.equal(pickupErr.pickup, '셔틀 이용 시 픽업·하원 주소를 최소 1곳 입력해 주세요');

  const a = studentFormSnapshot(named, [g1], false);
  const b = studentFormSnapshot(named, [{ ...g1, key: 'other-key' }], false);
  assert.equal(a, b);

  console.log('studentFormValidation.test.ts: ok');
}

run();
