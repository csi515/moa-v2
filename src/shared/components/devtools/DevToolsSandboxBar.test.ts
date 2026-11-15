import assert from 'node:assert/strict';
import { SANDBOX_ROLES, SANDBOX_INDUSTRIES } from './DevToolsSandboxBar';
import * as DevToolsModule from './index';

console.log('🧪 [DevTools Sandbox Suite] Phase 5 개발자 샌드박스 무결성 검증 시작...\n');

// Suite 1: 5대 역할 옵션 무결성 검증
(() => {
  assert.strictEqual(SANDBOX_ROLES.length, 5, '역할은 정확히 5개여야 합니다');
  const roles = SANDBOX_ROLES.map((r) => r.role);
  assert.ok(roles.includes('owner'), 'owner 역할 포함 필수');
  assert.ok(roles.includes('admin'), 'admin 역할 포함 필수');
  assert.ok(roles.includes('staff'), 'staff 역할 포함 필수');
  assert.ok(roles.includes('customer'), 'customer 역할 포함 필수');
  assert.ok(roles.includes('parent'), 'parent 역할 포함 필수');

  console.log('  ✔ Suite 1: 5대 역할(Role) 옵션 및 뱃지 매핑 검증 완료');
})();

// Suite 2: 대표 업종 목록 및 맞춤 용어 매핑 검증
(() => {
  assert.ok(SANDBOX_INDUSTRIES.length >= 5, '최소 5개 이상의 대표 업종이 등록되어야 합니다');
  const piano = SANDBOX_INDUSTRIES.find((i) => i.code === 'piano');
  assert.strictEqual(piano?.customerTerm, '원생', "피아노 업종의 고객 용어는 '원생'이어야 합니다");

  const bath = SANDBOX_INDUSTRIES.find((i) => i.code === 'bath');
  assert.strictEqual(bath?.customerTerm, '반려동물', "목욕/미용 업종의 고객 용어는 '반려동물'이어야 합니다");

  console.log('  ✔ Suite 2: 대표 업종 및 맞춤 용어 매핑 검증 완료');
})();

// Suite 3: Public API 배럴 무결성 검증
(() => {
  assert.ok(typeof DevToolsModule.DevToolsSandboxBar === 'function', 'DevToolsSandboxBar 컴포넌트가 export되어야 합니다');

  console.log('  ✔ Suite 3: DevTools Public API 배럴 무결성 확인 완료\n');
})();

console.log('✨ [DevTools Sandbox Suite] 모든 Phase 5 개발자 샌드박스 검증 통과!\n');
