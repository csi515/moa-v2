import { test, expect } from '@playwright/test';
import { injectAuthContext } from './fixtures/authContext';
import { installShuttleMocks } from './mocks/shuttleMocks';

test.describe('셔틀 운행 실화면', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthContext(page);
    await installShuttleMocks(page);
  });

  test('노선, 탑승 토글, 배차 상태, 터치 영역', async ({ page }) => {
    await page.goto('/e2e/shuttle');
    await expect(page.getByTestId('shuttle-route-select')).toBeVisible();
    await expect(page.getByTestId('stop-roster').first()).toBeVisible();
    await expect(page.getByTestId('dispatch-status')).toHaveText('운행 대기');

    const board = page.getByTestId('btn-board-toggle').first();
    await board.click();
    await expect(board).toBeVisible();

    const advance = page.getByTestId('btn-dispatch-advance');
    const box = await advance.boundingBox();
    expect(box && box.height >= 44).toBeTruthy();
    await advance.click();
    await expect(page.getByTestId('dispatch-status')).toHaveText('운행 중');
    await advance.click();
    await expect(page.getByTestId('dispatch-status')).toHaveText('운행 완료');
  });
});
