/**
 * Public Organization Service Unit Test
 * 실행: npx tsx src/core/public/services/publicOrgService.test.ts
 */
import assert from 'node:assert/strict';
import { publicOrgService } from './publicOrgService';

async function testPublicOrgService() {
  // 1. 공백 및 빈 문자열 조회 시 안전하게 null 반환
  const emptyRes = await publicOrgService.getOrganizationBySlugOrCode('');
  assert.equal(emptyRes, null, 'Empty string should return null');

  const whitespaceRes = await publicOrgService.getOrganizationBySlugOrCode('   ');
  assert.equal(whitespaceRes, null, 'Whitespace string should return null');

  // 2. 메서드 존재 및 시그니처 확인
  assert.equal(typeof publicOrgService.getOrganizationByCode, 'function');
  assert.equal(typeof publicOrgService.getOrganizationBySlugOrCode, 'function');
  assert.equal(typeof publicOrgService.searchOrganizations, 'function');
  assert.equal(typeof publicOrgService.submitConsultation, 'function');

  console.log('publicOrgService.test.ts OK');
}

testPublicOrgService().catch((err) => {
  console.error(err);
  process.exit(1);
});
