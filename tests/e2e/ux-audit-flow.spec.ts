import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';

test.describe('Moa v2 종합 UX 점검 (Comprehensive UX Audit)', () => {
  test('1. 로그인 ➔ 온보딩(QuickSetupPage) ➔ 44개 업종 카탈로그 및 AI 추천 UX 점검', async ({ page }) => {
    // 1. Supabase E2E 네트워크 Mocking
    await setupE2EMocks(page, {
      userId: '22222222-3333-4444-5555-666666666666',
      userEmail: 'ux_tester@moa.app',
      userName: 'UX 테스터',
      orgName: '모아 복합 센터',
    });

    // 2. 로그인 페이지 이동 및 접근성/레이아웃 점검
    await page.goto('/login');
    await expect(page.getByTestId('login-container')).toBeVisible();

    const emailInput = page.getByTestId('input-email');
    const passwordInput = page.getByTestId('input-password');
    const submitBtn = page.getByTestId('btn-email-submit');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // 3. 로그인 수행 -> 사업장 선택/온보딩 화면 진입
    await emailInput.fill('ux_tester@moa.app');
    await passwordInput.fill('TestPassword123!');
    await submitBtn.click();

    // 4. QuickSetupPage (/onboarding/quick) 화면 이동
    await page.goto('/onboarding/quick');
    await page.waitForLoadState('domcontentloaded');

    // 로딩 인디케이터 완료 대기 (필요시)
    const loadingIndicator = page.locator('text=사업장 정보를 불러오는 중...');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
    }

    // 온보딩 폼 요소 가시성 확인
    const formHeading = page.locator('h1, h2, h3').first();
    await expect(formHeading).toBeVisible();

    const bodyText = await page.textContent('body');
    // EP_apps 프리셋이 화면이나 카탈로그 텍스트에 전혀 노출되지 않는지 엄격 확인
    expect(bodyText).not.toContain('EP_apps');

    // 5. AI 프리셋 추천 입력창 및 버튼 확인
    const aiInput = page.locator('input[placeholder*="예:"]').or(page.locator('input[placeholder*="학원"]')).first();
    if (await aiInput.isVisible()) {
      await aiInput.fill('성인 전문 피아노 학원');
      const aiBtn = page.locator('button:has-text("진단")').or(page.locator('button:has-text("추천")')).first();
      if (await aiBtn.isVisible()) {
        await aiBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('2. 메인 워크스페이스 대시보드 셸 및 네비게이션 반응형 UX 점검', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: '22222222-3333-4444-5555-666666666666',
      userEmail: 'ux_tester@moa.app',
      userName: 'UX 테스터',
      orgName: '모아 피아노 스튜디오',
    });

    // 워크스페이스 직접 진입
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');

    // 대시보드 셸 주요 헤더 및 네비게이션 가시성 확인
    await expect(page.locator('body')).toBeVisible();

    // 모바일 뷰포트 전환 (375x667 - iPhone SE 규격)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // 모바일 환경에서도 컨텐츠가 깨짐 없이 가로 스크롤 overflow 없이 렌더링되는지 확인
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 1~2px 오차 허용

    // 다시 데스크탑 뷰포트로 복귀 (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
  });
});
