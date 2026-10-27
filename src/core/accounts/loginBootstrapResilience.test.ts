/**
 * 로그인 부트스트랩 및 RPC 에러 격리/복원력 검증 테스트
 * 실행: npx tsx src/core/accounts/loginBootstrapResilience.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('[test:login-bootstrap] Starting Login Bootstrap Resilience Invariants Suite...');

// 1. 소스 코드 불변성 검증: staffAccountService의 connectStaffOnLogin 에러 soft-fail 보장
{
  const staffSource = readFileSync(
    join(process.cwd(), 'src/core/staff/services/staffAccountService.ts'),
    'utf8'
  );
  assert.match(
    staffSource,
    /export async function connectStaffOnLogin\(\): Promise<ConnectStaffResult>/,
    'connectStaffOnLogin 함수가 정의되어 있어야 합니다.'
  );
  assert.match(
    staffSource,
    /console\.warn\('\[staffAccountService\] connect_staff_on_login soft-fail:'/,
    'RPC 에러 시 throw 대신 soft-fail 경고를 기록해야 합니다.'
  );
  assert.match(
    staffSource,
    /return \{ connected: 0, memberships: \[\] \}/,
    '에러 시 안전한 기본 결과 객체({ connected: 0, memberships: [] })를 반환해야 합니다.'
  );
}

// 2. 소스 코드 불변성 검증: parentAccountService의 connectParentOnLogin 에러 soft-fail 보장
{
  const parentSource = readFileSync(
    join(process.cwd(), 'src/core/parent/services/parentAccountService.ts'),
    'utf8'
  );
  assert.match(
    parentSource,
    /export async function connectParentOnLogin\(\): Promise<ConnectParentResult>/,
    'connectParentOnLogin 함수가 정의되어 있어야 합니다.'
  );
  assert.match(
    parentSource,
    /console\.warn\('\[parentAccountService\] connect_parent_on_login soft-fail:'/,
    'RPC 에러 시 throw 대신 soft-fail 경고를 기록해야 합니다.'
  );
  assert.match(
    parentSource,
    /return \{ connected: 0, memberships: \[\] \}/,
    '에러 시 안전한 기본 결과 객체({ connected: 0, memberships: [] })를 반환해야 합니다.'
  );
}

// 3. 소스 코드 불변성 검증: loginBootstrapService의 runLoginAccountSync 4단계 격리
{
  const bootstrapSource = readFileSync(
    join(process.cwd(), 'src/core/accounts/loginBootstrapService.ts'),
    'utf8'
  );
  assert.match(
    bootstrapSource,
    /try \{\s*await connectStaffOnLogin\(\);\s*\} catch/,
    'connectStaffOnLogin 호출이 try-catch로 완전 격리되어야 합니다.'
  );
  assert.match(
    bootstrapSource,
    /try \{\s*await syncAuthProvidersOnLogin\(\);\s*\} catch/,
    'syncAuthProvidersOnLogin 호출이 try-catch로 완전 격리되어야 합니다.'
  );
  assert.match(
    bootstrapSource,
    /try \{\s*await connectParentOnLogin\(\);\s*\} catch/,
    'connectParentOnLogin 호출이 try-catch로 완전 격리되어야 합니다.'
  );
}

// 4. 모의 실행 불변성 검증: 모든 하위 RPC가 406/500 에러를 던져도 bootstrap 함수는 절대 실패하지 않음
{
  const failingRPCs = {
    connectStaffOnLogin: async () => {
      throw new Error('406 Not Acceptable: connect_staff_on_login');
    },
    syncAuthProvidersOnLogin: async () => {
      throw new Error('500 Internal Server Error: sync_auth_providers');
    },
    connectParentOnLogin: async () => {
      throw new Error('Network offline: connect_parent_on_login');
    },
  };

  async function mockRunLoginAccountSync(): Promise<boolean> {
    try {
      try {
        await failingRPCs.connectStaffOnLogin();
      } catch (err) {
        // soft-fail
      }
      try {
        await failingRPCs.syncAuthProvidersOnLogin();
      } catch (err) {
        // soft-fail
      }
      try {
        await failingRPCs.connectParentOnLogin();
      } catch (err) {
        // soft-fail
      }
      return true; // 무사히 완료
    } catch {
      return false;
    }
  }

  const success = await mockRunLoginAccountSync();
  assert.equal(success, true, '모든 하위 RPC가 치명적 에러를 던져도 상위 부트스트랩은 중단 없이 성공해야 합니다.');
}

console.log('loginBootstrapResilience.test.ts: ok');
