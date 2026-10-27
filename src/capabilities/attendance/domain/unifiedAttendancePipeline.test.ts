import assert from 'node:assert/strict';
import {
  UnifiedAttendancePipeline,
  defaultAttendancePipeline,
  type AttendanceEvent,
} from './unifiedAttendancePipeline';
import { registerPinCheckInSideEffect } from '../application/pinCheckInSideEffects';

console.log('Testing unifiedAttendancePipeline...');

// 1. Verify default pipeline execution with pin_side_effects
let sideEffectCalledWith: string | null = null;
const unregister = registerPinCheckInSideEffect(async (customerId) => {
  sideEffectCalledWith = customerId;
  return { warning: undefined };
});

const pinEvent: AttendanceEvent = {
  customerId: 'cust-123',
  method: 'pin',
  status: 'check_in',
};

const result = await defaultAttendancePipeline.process(pinEvent);
assert.equal(result.ok, true, 'pipeline must succeed');
assert.equal(sideEffectCalledWith, 'cust-123', 'side effect must be called with customerId');
assert.ok(result.stepsExecuted.includes('pin_side_effects'), 'pin_side_effects step must be executed');

unregister();

// 2. Custom pipeline with multi-step execution
const customPipeline = new UnifiedAttendancePipeline();
const auditLog: string[] = [];

customPipeline.registerStep({
  id: 'step_validate',
  name: '검증 단계',
  enabled: () => true,
  execute: async (ev) => {
    auditLog.push(`validate:${ev.customerId}`);
    return { ok: true };
  },
});

customPipeline.registerStep({
  id: 'step_pass_deduct',
  name: '회차권 차감 단계',
  enabled: (ev) => ev.status === 'present',
  execute: async (ev) => {
    auditLog.push(`pass_deduct:${ev.customerId}`);
    return { ok: true, data: { passDeducted: true } };
  },
});

customPipeline.registerStep({
  id: 'step_notify',
  name: '알림 단계',
  enabled: (ev) => ev.status === 'present',
  execute: async (ev) => {
    auditLog.push(`notify:${ev.customerId}`);
    return { ok: true };
  },
});

const presentEvent: AttendanceEvent = {
  customerId: 'student-99',
  method: 'manual',
  status: 'present',
};

const customResult = await customPipeline.process(presentEvent);
assert.equal(customResult.ok, true);
assert.deepEqual(auditLog, [
  'validate:student-99',
  'pass_deduct:student-99',
  'notify:student-99',
]);
assert.deepEqual(customResult.stepsExecuted, ['step_validate', 'step_pass_deduct', 'step_notify']);

// 3. Skip disabled steps
auditLog.length = 0;
const absentEvent: AttendanceEvent = {
  customerId: 'student-99',
  method: 'manual',
  status: 'absent',
};
const absentResult = await customPipeline.process(absentEvent);
assert.equal(absentResult.ok, true);
assert.deepEqual(auditLog, ['validate:student-99']);
assert.deepEqual(absentResult.stepsExecuted, ['step_validate']);

console.log('unifiedAttendancePipeline.test.ts: all tests passed!');
