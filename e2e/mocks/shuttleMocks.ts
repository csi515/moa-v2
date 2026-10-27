import type { Page } from '@playwright/test';

/** 노선 조회, 배차 상태, 탑승 체크 RPC를 고정 응답으로 가로챈다. */
export async function installShuttleMocks(page: Page): Promise<void> {
  await page.route('**/mock-supabase.moa.local/**', async (route) => {
    const url = route.request().url();
    if (url.includes('rpc')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'BOARDED' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'route-1', vehicle_name: '1호차', status: 'WAITING' },
      ]),
    });
  });
}
