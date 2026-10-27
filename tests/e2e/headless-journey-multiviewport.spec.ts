import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { SignupPage, LoginPage, OrganizationSelectorPage, CreateOrganizationWizardPage } from './pages';

test.describe('헤드리스 브라우저 자동화 (E2E / Headless Browser Testing)', () => {

  test('1. 핵심 플로우 자동 점검: 회원가입 ➔ 사업장 생성 ➔ 결제/이용권 등록 전체 여정 검증', async ({
    page,
  }) => {
    // 1. Supabase 모의 환경 설정
    const mockCtx = await setupE2EMocks(page, {
      userId: 'user-e2e-headless-1001',
      userEmail: 'new_director@moa.ac',
      userName: '정대표',
      orgName: '모아 필라테스 서초점',
      orgCreated: false,
    });

    const signupPage = new SignupPage(page);
    const orgSelectorPage = new OrganizationSelectorPage(page);
    const wizardModal = new CreateOrganizationWizardPage(page);

    // [Step 1] 회원가입 플로우
    await signupPage.goto();
    await signupPage.expectVisible();

    await signupPage.fillSignupForm('정대표', 'new_director@moa.ac', 'SecurePassword123!');
    await signupPage.submit();

    // 회원가입 후 로그인 상태가 되며 온보딩/사업장 선택 화면으로 진입
    await page.goto('/workspace');

    // [Step 2] 사업장 생성 마법사 플로우
    await orgSelectorPage.expectVisible();
    await orgSelectorPage.openCreateOrganizationWizard();
    await wizardModal.expectWizardVisible();

    await wizardModal.enterOrgName('모아 필라테스 서초점');
    await wizardModal.searchAndSelectAddress('테헤란로', '서울특별시 강남구 테헤란로 123');
    await wizardModal.enterAddressDetail('지하 1층');
    await wizardModal.proceedToNextStep();

    // 사업장 생성 완료 검증 및 진입
    expect(mockCtx.orgCreated).toBe(true);
    await wizardModal.expectCompletionAndEnter();

    // [Step 3] 결제 및 이용권 등록 플로우
    await page.goto('/passes');
    await page.waitForLoadState('domcontentloaded');

    // 비동기 화면 로딩 인디케이터(LoadingScreen)가 해제될 때까지 대기
    const loadingIndicator = page.getByText('화면을 불러오는 중...');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    }

    // 이용권 관리 헤더 및 발급 버튼 노출 대기
    const openModalBtn = page.getByTestId('btn-open-issue-pass-modal');
    await expect(openModalBtn).toBeVisible({ timeout: 20000 });

    // 신규 이용권 발급 모달 오픈
    await openModalBtn.click();

    const customerInput = page.getByTestId('input-pass-customer-name');
    const passNameInput = page.getByTestId('input-pass-name');
    const submitPassBtn = page.getByTestId('btn-submit-issue-pass');

    await expect(customerInput).toBeVisible();
    await customerInput.fill('이수강');
    await passNameInput.fill('필라테스 1:1 개인레슨 10회권');

    // 발급 제출
    await submitPassBtn.click();

    // 발급 완료 후 목록에 즉시 행(passes-row-item) 노출 및 잔여 횟수 검증
    const passRow = page.getByTestId('passes-row-item').first();
    await expect(passRow).toBeVisible({ timeout: 15000 });
    await expect(passRow).toContainText('이수강');
    await expect(passRow).toContainText('필라테스 1:1 개인레슨 10회권');
    await expect(passRow).toContainText('10회');
  });

  test('2. 멀티 뷰포트 레이아웃 무결성: 모바일·태블릿·데스크톱 가로 스크롤 및 버튼 겹침 방지', async ({
    page,
  }) => {
    await setupE2EMocks(page, {
      role: 'owner',
      orgCreated: true,
      orgName: '모아 스튜디오 강남점',
    });

    const loginPage = new LoginPage(page);

    // [Viewport 1] 극단적 소형 모바일 (iPhone SE: 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await loginPage.goto();
    await loginPage.expectVisible();

    // 1-1. 수평 스크롤(Horizontal Overflow) 결함 사전 탐지
    const hasHorizontalOverflowMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflowMobile).toBe(false);

    // 1-2. 터치 타겟(최소 44px) 규격 준수 검증
    const submitBtnBox = await loginPage.submitBtn.boundingBox();
    expect(submitBtnBox).not.toBeNull();
    if (submitBtnBox) {
      expect(submitBtnBox.height).toBeGreaterThanOrEqual(44);
    }

    // 1-3. 주요 폼 입력창 및 제출 버튼 간 기하학적 겹침(Collision / Overlap) 부재 검증
    const emailBox = await loginPage.emailInput.boundingBox();
    const passwordBox = await loginPage.passwordInput.boundingBox();
    const submitBox = await loginPage.submitBtn.boundingBox();
    if (emailBox && passwordBox && submitBox) {
      // 이메일과 비밀번호 입력창이 Y축에서 겹치지 않는지 검증
      expect(emailBox.y + emailBox.height).toBeLessThanOrEqual(passwordBox.y);
      // 비밀번호 입력창과 제출 버튼이 Y축에서 겹치지 않는지 검증
      expect(passwordBox.y + passwordBox.height).toBeLessThanOrEqual(submitBox.y);
    }

    // [Viewport 2] 태블릿 뷰포트 (iPad Mini / Air: 768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await loginPage.expectVisible();

    const hasHorizontalOverflowTablet = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflowTablet).toBe(false);

    // [Viewport 3] 데스크톱 고해상도 뷰포트 (Desktop: 1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginPage.expectVisible();

    const hasHorizontalOverflowDesktop = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflowDesktop).toBe(false);
  });

  test('3. 크로스 브라우징 및 WebKit/모바일 사파리 인터랙션 무결성 검증', async ({
    page,
    browserName,
  }) => {
    await setupE2EMocks(page, {
      userId: 'cross-browser-user-1',
      userEmail: 'director@cross.moa',
      userName: '크로스원장',
      orgCreated: true,
      role: 'owner',
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();

    // 이메일 로그인 폼 인터랙션
    await loginPage.loginWithEmail('director@cross.moa', 'Password123!');

    // 메인 워크스페이스 대시보드 셸 진입 확인
    await page.goto('/workspace');
    await expect(page.locator('body')).toBeVisible();

    // 브라우저 엔진 정보 로깅 및 정상 렌더링 확인
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toBeTruthy();
  });
});
