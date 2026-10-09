/**
 * 사업장 생성 및 수정 주소 정규화 및 구조화 필드 검증
 * 실행: npx tsx src/core/address/formatOrganizationAddress.test.ts
 */
import assert from 'node:assert/strict';
import {
  formatOrganizationAddress,
  normalizeCreateOrganizationAddress,
} from './formatOrganizationAddress';
import { EMPTY_ORGANIZATION_ADDRESS, type OrganizationAddressValue } from './types';

function run() {
  // 1. 기본 빈 주소
  assert.equal(formatOrganizationAddress(EMPTY_ORGANIZATION_ADDRESS), '');

  // 2. 도로명 + 상세주소
  const fullAddr: OrganizationAddressValue = {
    roadAddress: '서울특별시 강남구 테헤란로 152',
    addressDetail: '3층 301호',
    postal: '06236',
    sido: '서울특별시',
    sigungu: '강남구',
    dong: '역삼동',
    jibun: '서울특별시 강남구 역삼동 737',
  };
  assert.equal(
    formatOrganizationAddress(fullAddr),
    '서울특별시 강남구 테헤란로 152 3층 301호'
  );

  // 3. 도로명만 있는 경우
  const roadOnly: OrganizationAddressValue = {
    ...EMPTY_ORGANIZATION_ADDRESS,
    roadAddress: '경기도 성남시 분당구 판교역로 166',
  };
  assert.equal(
    formatOrganizationAddress(roadOnly),
    '경기도 성남시 분당구 판교역로 166'
  );

  // 4. 생성 시 레거시 문자열 및 fallback 주소 정규화
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
