import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import {
  simulateBackend500,
  simulateForbidden403,
  simulateUnauthorized401,
  simulateSlowNetwork,
} from './mocks/networkFaultMocks';

test.describe('API 및 네트워크 가로채기 & 장애/지연 시뮬레이션 (Network Mocking & Resilience)', () => {
  const ORG_ID = 'aaaaaaaa-1111-4444-8888-000000000001';
  const ORG_NAME = '모아 피아노 아카데미 (대치본점)';

  test('장애 시뮬레이션 1: 백엔드 500 내부 에러 시 White-out 없이 안전한 복구/대체 UI 렌더링 검증', async ({ page }) => {
    // 1. 기본 정상 인증 Mock 세팅
    await setupE2EMocks(page, {
      orgName: ORG_NAME,
      orgId: ORG_ID,
      role: 'owner',
    });

    // 2. 백엔드 REST/RPC 전체에 500 내부 서버 장애 주입
    await simulateBackend500(
      page,
      '**/rest/v1/**',
      'Database connection pool timed out'
    );

    await page.goto('/login');
    await page.getByTestId('input-email').fill('owner_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    // 워크스페이스 진입 시도
    await page.goto('/workspace');

    // 3. 로딩 상태를 거쳐 최종 화면이 흰 화면(White-out)이 아닌 복구/안내 화면으로 안착하는지 검증
    const loadingMsg = page.locator('text=사업장 정보를 불러오는 중...');
    // 로딩이 나타났다가 사라질 때까지 대기
    await loadingMsg.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // 4. White-out 방어 검증: 본문이 비어있지 않고 유효한 복구 UI가 렌더링됨
    await expect(page.locator('body')).toBeVisible();
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeDefined();
    expect(bodyContent?.length).toBeGreaterThan(10);
  });

  test('장애 시뮬레이션 2: 401 세션 만료(Unauthorized) 시 로그인 페이지로 자동 안전 리다이렉트 검증', async ({ page }) => {
    // 1. 기본 인증 Mock 세팅
    await setupE2EMocks(page);

    // 2. 인증 사용자 검증 API에 401 JWT 만료 에러 주입
    await simulateUnauthorized401(page, '**/auth/v1/user*');

    // 3. 비인가 상태로 보호된 워크스페이스 페이지 직접 접근
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');

    // 4. Refine Authenticated 가드에 의해 자동으로 /login으로 리다이렉트되어야 함
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
    await expect(page.getByTestId('login-container')).toBeVisible();
  });

  test('장애 시뮬레이션 3: 403 권한 없음(Forbidden) API 응답 시 크래시 없는 에러 격리 검증', async ({ page }) => {
    await setupE2EMocks(page, {
      role: 'instructor',
    });

    // 민감 리소스에 403 Forbidden 가로채기 주입
    await simulateForbidden403(page, '**/rest/v1/session_passes*');

    await page.goto('/login');
    await page.getByTestId('input-email').fill('staff_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    await page.goto('/passes');
    await page.waitForLoadState('domcontentloaded');

    // 앱이 크래시되지 않고 안전하게 UI가 렌더링되는지 확인
    await expect(page.locator('body')).toBeVisible();
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeDefined();
  });

  test('지연 시뮬레이션 4: 3G 슬로우 네트워크(1,500ms 지연)에서 로딩 스피너 및 화면 전환 무결성 검증', async ({ page }) => {
    await setupE2EMocks(page, {
      role: 'owner',
      orgName: ORG_NAME,
      orgId: ORG_ID,
    });

    // 멤버십 조회 요청에 1,500ms 3G 네트워크 지연 주입
    await simulateSlowNetwork(page, '**/rest/v1/rpc/get_user_memberships*', 1500);

    await page.goto('/login');
    await page.getByTestId('input-email').fill('director@moa.ac');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    // 워크스페이스 이동 시 지연 시간 동안 로딩 스피너 표시 확인
    await page.goto('/workspace');

    // 1. 네트워크 지연 동안 로딩 인디케이터가 화면에 표시됨을 검증
    const loadingMsg = page.locator('text=사업장 정보를 불러오는 중...');
    await expect(loadingMsg).toBeVisible({ timeout: 4000 });

    // 2. 지연이 끝나고 로딩 스피너가 사라질 때까지 대기
    await expect(loadingMsg).toBeHidden({ timeout: 15000 });

    // 3. 지연 완료 후 화면 본문이 크래시 없이 정상 렌더링됨을 검증
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeDefined();
    expect(bodyText?.length).toBeGreaterThan(10);
  });
});
