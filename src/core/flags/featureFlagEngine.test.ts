/**
 * Moa-v2 Feature Flag & Beta Track Canary Engine Tests
 *
 * 1. 마스터 킬스위치 즉시 차단 불변성
 * 2. TestFlight / 내부 테스트 트랙 격리 불변성
 * 3. 특정 사용자 및 특정 매장 Allowlist 타겟팅 불변성
 * 4. FNV-1a 결정적 해시 기반 카나리 롤아웃(20%, 50%) 수학적 분포 및 일관성
 * 5. 네이티브 하드웨어 기능(푸시/카메라/생체) 폴백 검증
 */

import assert from 'node:assert/strict';
import {
  evaluateFeatureFlag,
  getCanaryBucket,
  resolveNativeCapabilities,
  type FeatureFlagRule,
} from './featureFlagEngine';

async function runFeatureFlagTests() {
  console.log('🧪 [Feature Flag & Beta Track] 피처 플래그 및 베타 트랙 카나리 불변조건 검증 시작...\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 1: 마스터 킬스위치 (Master Kill-switch)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 1: 마스터 킬스위치(Kill-switch) 즉시 차단 불변성');
  {
    const rule: FeatureFlagRule = {
      key: 'emergency_kill_flag',
      description: '장애 시 즉시 전체 차단 플래그',
      enabled: false,
      allowlistUsers: ['vip@moa.ac'],
      rolloutPercentage: 100,
    };

    const result = evaluateFeatureFlag(rule, {
      userId: 'vip-user',
      userEmail: 'vip@moa.ac',
      track: 'testflight',
      role: 'owner',
    });

    assert.equal(result.isEnabled, false, 'enabled: false이면 어떤 조건에서도 차단되어야 함');
    assert.equal(result.reason, 'MASTER_SWITCH_OFF');
    console.log('  ✔ 통과: 마스터 킬스위치 발동 시 전체 트래픽 원천 차단 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 2: 내부 테스터 트랙 (TestFlight / Google Internal Test) 가드
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 2: 내부 테스터 트랙(TestFlight / Google Internal) 전용 기능 격리');
  {
    const rule: FeatureFlagRule = {
      key: 'native_biometric_login',
      description: '네이티브 생체인증 테스트 기능',
      enabled: true,
      betaTrackOnly: true,
    };

    // 2-1. 프로덕션 트랙 사용자 -> 차단
    const prodUser = evaluateFeatureFlag(rule, { track: 'production' });
    assert.equal(prodUser.isEnabled, false, '프로덕션 트랙 사용자는 betaTrackOnly 기능을 볼 수 없음');
    assert.equal(prodUser.reason, 'BETA_TRACK_ONLY');

    // 2-2. TestFlight 테스터 -> 허용
    const testFlightUser = evaluateFeatureFlag(rule, { track: 'testflight' });
    assert.equal(testFlightUser.isEnabled, true, 'TestFlight 테스터에게는 정상 오픈되어야 함');

    // 2-3. Google Play 내부 테스트 트랙 -> 허용
    const googleUser = evaluateFeatureFlag(rule, { track: 'google_internal' });
    assert.equal(googleUser.isEnabled, true, '구글 플레이 내부 테스터에게는 정상 오픈되어야 함');

    console.log('  ✔ 통과: TestFlight 및 내부 테스터 트랙 사용자에게만 안전하게 선오픈 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 3: 특정 사용자 및 특정 매장(Tenant) Allowlist 타겟팅
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 3: 특정 사용자 및 특정 매장(Tenant) 정밀 타겟팅 검증');
  {
    const rule: FeatureFlagRule = {
      key: 'pilot_instant_settlement',
      description: '파일럿 매장 및 지정 테스터 전용 즉시 정산',
      enabled: true,
      allowlistUsers: ['tester@moa.ac', 'user-alpha-99'],
      allowlistTenants: ['org-pilot-seoul-01'],
    };

    // 3-1. 허용된 이메일 테스터 -> 허용
    const userByEmail = evaluateFeatureFlag(rule, { userEmail: 'tester@moa.ac' });
    assert.equal(userByEmail.isEnabled, true);
    assert.equal(userByEmail.reason, 'USER_ALLOWLIST_MATCH');

    // 3-2. 허용된 파일럿 매장 -> 허용
    const tenantUser = evaluateFeatureFlag(rule, { organizationId: 'org-pilot-seoul-01' });
    assert.equal(tenantUser.isEnabled, true);
    assert.equal(tenantUser.reason, 'TENANT_ALLOWLIST_MATCH');

    // 3-3. 일반 사용자/일반 매장 -> 차단
    const normalUser = evaluateFeatureFlag(rule, {
      userId: 'user-normal-01',
      userEmail: 'normal@moa.ac',
      organizationId: 'org-normal-01',
    });
    assert.equal(normalUser.isEnabled, false);
    assert.equal(normalUser.reason, 'NOT_IN_ANY_ALLOWLIST');

    console.log('  ✔ 통과: 특정 파일럿 매장 및 테스터 계정 정밀 타겟팅 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 4: 결정적 해시(FNV-1a) 기반 점진적 카나리(Canary %) 롤아웃 일관성 및 통계 검증
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 4: 점진적 카나리(Canary % Rollout) 결정적 해시 일관성 및 비율 검증');
  {
    const flagKey = 'new_checkout_flow';
    const rule20Percent: FeatureFlagRule = {
      key: flagKey,
      description: '신규 결제창 20% 카나리 오픈',
      enabled: true,
      rolloutPercentage: 20,
    };

    // 4-1. 결정적 일관성: 동일한 사용자는 100번 재평가해도 항상 동일한 결과 반환
    const testUserId = 'user-fixed-uuid-12345';
    const firstEval = evaluateFeatureFlag(rule20Percent, { userId: testUserId });
    for (let i = 0; i < 100; i++) {
      const repeatEval = evaluateFeatureFlag(rule20Percent, { userId: testUserId });
      assert.equal(repeatEval.isEnabled, firstEval.isEnabled, '동일 유저의 플래그 결과는 절대 변하지 않아야 함');
    }

    // 4-2. 1,000명의 가상 사용자를 대상으로 20% 롤아웃 시 실제 버킷 분포 검증
    let enabledCount = 0;
    const totalUsers = 1000;
    for (let i = 0; i < totalUsers; i++) {
      const uid = `simulated-user-${i}`;
      const res = evaluateFeatureFlag(rule20Percent, { userId: uid });
      if (res.isEnabled) enabledCount++;
    }

    const actualRatio = enabledCount / totalUsers;
    console.log(`    - 20% 카나리 시뮬레이션: 1,000명 중 ${enabledCount}명 활성화 (실측 비율: ${(actualRatio * 100).toFixed(1)}%)`);
    // 20% 기준 ± 4% 오차 범위 내 수렴 확인 (16% ~ 24%)
    assert.ok(actualRatio >= 0.16 && actualRatio <= 0.24, '20% 카나리 비율이 통계적으로 정상 수렴해야 함');

    console.log('  ✔ 통과: 플리커링 없는 결정적 해시 일관성 및 통계적 카나리 분포 검증 완료\n');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Suite 5: 네이티브 기능 하드웨어 가드 및 웹 안전 폴백 검증
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ Suite 5: 네이티브 기능(푸시/카메라/생체) 하드웨어 가드 및 웹 폴백');
  {
    // 5-1. 모바일 앱 네이티브 환경
    const nativeCaps = resolveNativeCapabilities(true, 'testflight');
    assert.equal(nativeCaps.hasPushNotifications, true);
    assert.equal(nativeCaps.hasCamera, true);
    assert.equal(nativeCaps.hasBiometrics, true);
    assert.equal(nativeCaps.track, 'testflight');

    // 5-2. 일반 웹 브라우저 환경 (생체인증 등 크래시 방지용 false 가드)
    const webCaps = resolveNativeCapabilities(false, 'production');
    assert.equal(webCaps.hasBiometrics, false, '일반 웹에서는 생체인증이 안전하게 false로 가드되어야 함');
    assert.equal(webCaps.track, 'production');

    console.log('  ✔ 통과: 네이티브 하드웨어 기능 감지 및 브라우저 크래시 방지 폴백 검증 완료\n');
  }

  console.log('✨ [Feature Flag & Beta Track] 5대 핵심 영역 피처 플래그 및 베타 트랙 불변성 테스트 100% 통과!\n');
}

runFeatureFlagTests().catch((err) => {
  console.error('❌ Feature Flag Tests 실패:', err);
  process.exit(1);
});
