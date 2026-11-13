import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { LoginPage, OrganizationSelectorPage, CreateOrganizationWizardPage } from './pages';

/**
 * Director journey smoke (Wave 3):
 * 로그인 → /onboarding/org(사업장 선택) → 학원 개설 → 워크스페이스 진입
 * 실제 이메일 가입·수납은 스테이징 fixture 계정으로 확장한다.
 */
test.describe('Director signup-to-workspace journey', () => {
  test('로그인 후 사업장 온보딩 경로로 진입하고 학원을 개설한다', async ({ page }) => {
    const mockCtx = await setupE2EMocks(page, {
      userId: '11111111-2222-3333-4444-555555555555',
      userEmail: 'director.journey@moa.ac',
      userName: '여정원장',
      orgName: '모아 피아노 여정학원',
    });

    const loginPage = new LoginPage(page);
    const orgSelectorPage = new OrganizationSelectorPage(page);
    const wizardModal = new CreateOrganizationWizardPage(page);

    await loginPage.goto();
    await loginPage.expectVisible();
    await loginPage.loginWithEmail('director.journey@moa.ac', 'Password123!');

    // Wave 2: 기본 post-login 목적지는 /onboarding/org
    await page.waitForURL(/\/(onboarding\/org|workspace|)/, { timeout: 15000 });
    await orgSelectorPage.expectVisible();

    await orgSelectorPage.openCreateOrganizationWizard();
    await wizardModal.expectWizardVisible();
    await wizardModal.enterOrgName('모아 피아노 여정학원');
    await wizardModal.searchAndSelectAddress('테헤란로', '서울특별시 강남구 테헤란로 123');
    await wizardModal.enterAddressDetail('2층');
    await wizardModal.proceedToNextStep();
    await wizardModal.skipRoomsAndFinish();

    expect(mockCtx.orgCreated).toBe(true);
    await wizardModal.expectCompletionAndEnter();
  });

  test('공개 여정 라우트 스모크: recovery / invite/accept', async ({ page }) => {
    await page.goto('/auth/recovery');
    await expect(page.getByTestId('recovery-password-page')).toBeVisible({ timeout: 10000 });

    await page.goto('/invite/accept');
    await expect(page.getByTestId('invite-accept-landing')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('invite-token-input').fill('sample-invite-token');
    await page.getByTestId('invite-token-submit').click();
    await expect(page).toHaveURL(/\/invite\/staff\/sample-invite-token/);
  });
});
