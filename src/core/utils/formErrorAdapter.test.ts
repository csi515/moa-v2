import assert from 'node:assert/strict';
import { extractErrorMap, applyFormErrors, type BusinessResult } from './formErrorAdapter';

console.log('[TEST] formErrorAdapter running...');

// 1. Success case -> no errors
{
  const successResult: BusinessResult = { success: true, data: { id: 1 } };
  const map = extractErrorMap(successResult);
  assert.deepEqual(map, {});

  let called = false;
  const hasErrors = applyFormErrors(successResult, () => {
    called = true;
  });
  assert.equal(hasErrors, false);
  assert.equal(called, false);
}

// 2. Single structured error
{
  const failedResult: BusinessResult = {
    success: false,
    error: { field: 'phone', message: '전화번호 형식이 올바르지 않습니다.' },
  };
  const map = extractErrorMap(failedResult);
  assert.deepEqual(map, { phone: '전화번호 형식이 올바르지 않습니다.' });

  const applied: Record<string, string> = {};
  const hasErrors = applyFormErrors(failedResult, (field, err) => {
    applied[field] = err.message;
  });
  assert.equal(hasErrors, true);
  assert.deepEqual(applied, { phone: '전화번호 형식이 올바르지 않습니다.' });
}

// 3. String error with fallback to root
{
  const failedResult: BusinessResult = {
    success: false,
    error: '유효하지 않은 토큰입니다.',
  };
  const map = extractErrorMap(failedResult);
  assert.deepEqual(map, { root: '유효하지 않은 토큰입니다.' });
}

// 4. Multiple errors array
{
  const failedResult: BusinessResult = {
    success: false,
    errors: [
      { field: 'name', message: '이름을 입력해주세요.' },
      { field: 'phone', message: '전화번호를 입력해주세요.' },
    ],
  };
  const map = extractErrorMap(failedResult);
  assert.deepEqual(map, {
    name: '이름을 입력해주세요.',
    phone: '전화번호를 입력해주세요.',
  });
}

console.log('[TEST] formErrorAdapter ALL PASSED!');
