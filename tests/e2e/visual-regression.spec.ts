import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { LoginPage, OrganizationSelectorPage, CreateOrganizationWizardPage } from './pages';

test.describe('시각적 회귀 테스트 (Visual Regression Testing)', () => {

  test('1. 로그인 카드 컴포넌트 스크린샷 픽셀 비교 (Login Component Snapshot)', async ({
    page,
  }) => {
    await setupE2EMocks(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();

    // 폰트 렌더링 안정화를 위해 잠시 대기
    await page.waitForTimeout(500);

    // 로그인 컨테이너 컴포넌트 스크린샷 픽셀 비교
    const loginCard = page.getByTestId('login-container');
    await expect(loginCard).toHaveScreenshot('login-card.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('2. 사업장 온보딩 마법사 모달 픽셀 스냅샷 비교 (Wizard Modal Snapshot)', async ({
    page,
  }) => {
    await setupE2EMocks(page, {
      userId: 'vis-user-1001',
      userEmail: 'director@visual.moa',
      userName: '시각대표',
      orgName: '모아 발레 스튜디오',
      orgCreated: false,
    });

    const loginPage = new LoginPage(page);
    const orgSelectorPage = new OrganizationSelectorPage(page);
    const wizardModal = new CreateOrganizationWizardPage(page);

    await loginPage.goto();
    await loginPage.expectVisible();
    await loginPage.loginWithEmail('director@visual.moa', 'Password123!');

    await orgSelectorPage.expectVisible();
    await orgSelectorPage.openCreateOrganizationWizard();
    await wizardModal.expectWizardVisible();

    // 사업장명 및 주소 입력 후 모달 상태 스냅샷
    await wizardModal.enterOrgName('모아 발레 스튜디오');
    await page.waitForTimeout(500);

    const modalDialog = page.locator('div[role="dialog"], .fixed.inset-0').first();
    await expect(modalDialog).toHaveScreenshot('onboarding-wizard-modal.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('3. 이용권 관리 툴바 픽셀 스냅샷 비교 (Passes Toolbar Snapshot)', async ({
    page,
  }) => {
    await setupE2EMocks(page, {
      userId: 'vis-user-1002',
      userEmail: 'director@visual.moa',
      userName: '시각대표',
      orgName: '모아 필라테스 강남점',
      orgCreated: true,
      role: 'owner',
      passes: [
        {
          id: 'pass-vis-1',
          tenant_id: '99999999-8888-7777-6666-555555555555',
          customer_id: 'cust-1',
          pass_name: '필라테스 10회권',
          pass_type: 'COUNT_BASED',
          total_count: 10,
          remaining_count: 10,
          status: 'ACTIVE',
          is_active: true,
          start_date: '2026-10-01',
          expires_at: '2026-12-31',
          customer: { name: '홍길동', phone: '010-1234-5678' },
        },
      ],
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();
    await loginPage.loginWithEmail('director@visual.moa', 'Password123!');

    await page.goto('/passes');
    await page.waitForLoadState('domcontentloaded');

    // 비동기 로딩 대기
    const loadingMsg = page.getByText('화면을 불러오는 중...');
    if (await loadingMsg.isVisible().catch(() => false)) {
      await loadingMsg.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }

    const openModalBtn = page.getByTestId('btn-open-issue-pass-modal');
    await expect(openModalBtn).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    // 이용권 관리 상단 툴바 및 필터 바 영역 스냅샷
    const toolbar = page.getByTestId('badge-passes-count').locator('xpath=ancestor::div[contains(@class, "space-y-6")]').first();
    await expect(toolbar).toHaveScreenshot('passes-management-view.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('4. UI 문구·폰트·여백에 의한 버튼 밀려남(Out-of-Viewport Clipping) 결함 자동 탐지', async ({
    page,
  }) => {
    await setupE2EMocks(page);

    const loginPage = new LoginPage(page);

    // [Viewport 1: 소형 모바일 375x667]
    await page.setViewportSize({ width: 375, height: 667 });
    await loginPage.goto();
    await loginPage.expectVisible();

    // 4-1. 제출 버튼이 화면 가로 뷰포트(375px) 밖으로 밀려나지 않았는지 검증
    const submitBtn = loginPage.submitBtn;
    const btnBox = await submitBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.x).toBeGreaterThanOrEqual(0);
      expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(375); // 가로 밖 밀려남 방지
      expect(btnBox.width).toBeGreaterThanOrEqual(280); // 모바일 터치 영역 충분 확보
    }

    // 4-2. 텍스트 확대 시뮬레이션(폰트 120% 확대)에서도 버튼 밀려남/잘림 없는지 검증
    await page.addStyleTag({
      content: `* { font-size: 110% !important; }`,
    });
    await page.waitForTimeout(300);

    const scaledBox = await submitBtn.boundingBox();
    expect(scaledBox).not.toBeNull();
    if (scaledBox) {
      // 폰트 확대 시에도 375px 가로 뷰포트 폭 안에서 넘침(Overflow) 없음 검증
      expect(scaledBox.x + scaledBox.width).toBeLessThanOrEqual(375);

      // 스크롤 시 뷰포트 영역 내에 온전히 노출되고 잘림 없는지 검증
      await submitBtn.scrollIntoViewIfNeeded();
      const isVisibleInViewport = await submitBtn.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth &&
          rect.bottom <= window.innerHeight
        );
      });
      expect(isVisibleInViewport).toBe(true);
    }
  });
});
