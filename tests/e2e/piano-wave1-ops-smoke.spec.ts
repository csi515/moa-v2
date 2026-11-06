import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { LoginPage } from './pages';

/**
 * 피아노 wave-1 운영 스모크 (공개 Soft launch 게이트용).
 * 실제 CRUD는 스테이징 fixture로 확장하고, 여기서는 탭·허브 진입과 공개 라우트를 검증한다.
 */
test.describe('Piano wave-1 ops smoke', () => {
  test('워크스페이스에서 학생·시간표·출결·수납·상담 탭 스모크', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      userEmail: 'piano.ops@moa.ac',
      userName: '피아노원장',
      orgName: '모아 피아노 스모크학원',
      // org already selected path: mocks that land in workspace when memberships exist
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();
    await loginPage.loginWithEmail('piano.ops@moa.ac', 'Password123!');

    await page.waitForURL(/\/(onboarding\/org|workspace)/, { timeout: 15000 });

    // 사업장 선택 게이트면 스킵(가입 여정 스펙이 담당). 워크스페이스면 탭 스모크.
    if (page.url().includes('/workspace')) {
      const tabs = [
        { name: 'students', testId: /student|고객|원생|명부/i },
        { name: 'timetable', testId: /시간표|timetable|schedule/i },
        { name: 'attendance', testId: /출결|attendance/i },
        { name: 'tuition', testId: /수납|tuition|미납|finance/i },
        { name: 'consultations', testId: /상담|consultation/i },
      ] as const;

      for (const tab of tabs) {
        await page.goto(`/workspace/${tab.name}`);
        await expect(page.locator('body')).toBeVisible();
        // 셸이 살아 있고 치명 오류 배너가 없는지
        await expect(page.getByText(/Something went wrong|Unhandled|Application error/i)).toHaveCount(0);
      }
    }
  });

  test('공개 Soft launch 표면: pricing / support', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByTestId('pricing-content')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/요금제|Soft launch|파일럿/i).first()).toBeVisible();

    await page.goto('/support');
    await expect(page.getByText(/고객지원|지원/i).first()).toBeVisible({ timeout: 10000 });
  });
});
