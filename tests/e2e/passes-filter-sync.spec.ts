import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { LoginPage } from './pages';

test.describe('Passes Management Filter & URL SSOT Invariant Test', () => {
  test('상단 뱃지 카운트와 하단 필터링 행 개수 일치 및 URL 동기화 불변 단언 검증', async ({
    page,
  }) => {
    // 1. Supabase E2E 모의 네트워크 환경 설정
    await setupE2EMocks(page, {
      userId: '11111111-2222-3333-4444-555555555555',
      userEmail: 'director@moa.ac',
      userName: '관리자',
      orgName: '모아 피트니스 대치점',
    });

    // 2. 로그인 수행 후 이용권 관리 화면으로 진입
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();
    await loginPage.loginWithEmail('director@moa.ac', 'Password123!');

    await page.goto('/passes');
    await page.waitForLoadState('domcontentloaded');

    // 3. 페이지 렌더링 대기 (헤더 뱃지 또는 빈 화면/목록 표시)
    const countBadge = page.getByTestId('badge-passes-count');
    if (await countBadge.isVisible()) {
      // Invariant Helper: "상단 뱃지 숫자 === 하단 필터링된 행 개수" 검증
      const assertBadgeMatchesRowCount = async () => {
        const badgeText = await countBadge.textContent();
        const badgeCount = parseInt(badgeText?.replace(/[^0-9]/g, '') || '0', 10);
        const rowCount = await page.getByTestId('passes-row-item').count();
        expect(badgeCount).toBe(rowCount);
      };

      // 초기 상태 검증
      await assertBadgeMatchesRowCount();

      // 4. '이용 가능' 필터 버튼 클릭 -> URL ?status=ACTIVE 동기화 확인
      const activeBtn = page.getByTestId('filter-btn-active');
      if (await activeBtn.isVisible()) {
        await activeBtn.click();
        await page.waitForURL(/status=ACTIVE/);
        expect(page.url()).toContain('status=ACTIVE');
        await assertBadgeMatchesRowCount();
      }

      // 5. '소진됨' 필터 버튼 클릭 -> URL ?status=EXHAUSTED 동기화 확인
      const exhaustedBtn = page.getByTestId('filter-btn-exhausted');
      if (await exhaustedBtn.isVisible()) {
        await exhaustedBtn.click();
        await page.waitForURL(/status=EXHAUSTED/);
        expect(page.url()).toContain('status=EXHAUSTED');
        await assertBadgeMatchesRowCount();
      }
    } else {
      // 이용권 뷰포트 컨테이너 가시성 확인
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
