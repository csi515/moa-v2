/**
 * 사업장 생성 주소 정규화.
 * 실행: npx tsx src/core/address/formatOrganizationAddress.test.ts
 */
import assert from 'node:assert/strict';
import {
  formatOrganizationAddress,
  normalizeCreateOrganizationAddress,
} from './formatOrganizationAddress';
import { EMPTY_ORGANIZATION_ADDRESS } from './types';

function run() {
  assert.equal(formatOrganizationAddress(EMPTY_ORGANIZATION_ADDRESS), '');
  assert.equal(
    formatOrganizationAddress({
      ...EMPTY_ORGANIZATION_ADDRESS,
      roadAddress: '서울시 강남구 테헤란로 1',
      addressDetail: '3층',
    }),
    '서울시 강남구 테헤란로 1 3층'
  );

  assert.equal(normalizeCreateOrganizationAddress(EMPTY_ORGANIZATION_ADDRESS), '');
  assert.equal(normalizeCreateOrganizationAddress(undefined, '-'), '');
  assert.equal(normalizeCreateOrganizationAddress(undefined, '없음'), '없음');
  assert.equal(
    normalizeCreateOrganizationAddress({
      ...EMPTY_ORGANIZATION_ADDRESS,
      roadAddress: '서울시 강남구 테헤란로 1',
    }),
    '서울시 강남구 테헤란로 1'
  );
  assert.equal(
    normalizeCreateOrganizationAddress(EMPTY_ORGANIZATION_ADDRESS, '서울시 종로구'),
    '서울시 종로구'
  );

  console.log('formatOrganizationAddress.test.ts: ok');
}

run();
