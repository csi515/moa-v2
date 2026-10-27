import type { Page, Route } from '@playwright/test';
import { setupE2EMocks, type MockE2EContext } from './supabaseMocks';

/**
 * Network Fault & Delay Simulation Helper for Playwright
 * (API 가로채기 및 장애/지연 시뮬레이션 도구)
 */

/**
 * 특정 패턴의 API 요청을 가로채 HTTP 500 내부 서버 에러를 주입
 */
export async function simulateBackend500(
  page: Page,
  urlPattern: string = '**/rest/v1/rpc/get_user_memberships*',
  customMessage: string = 'Internal Server Error (Database Connection Pool Exhausted)'
) {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        code: '500',
        message: customMessage,
        details: 'Simulated 500 backend disaster',
      }),
    });
  });
}

/**
 * 특정 패턴의 API 요청을 가로채 HTTP 403 Forbidden 권한 없음 에러를 주입
 */
export async function simulateForbidden403(
  page: Page,
  urlPattern: string = '**/rest/v1/**',
  customMessage: string = 'Permission Denied: Missing settlement:read capability'
) {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        code: '42501',
        message: customMessage,
        hint: 'Row Level Security policy violation',
      }),
    });
  });
}

/**
 * 세션 만료(401 Unauthorized) 시뮬레이션
 */
export async function simulateUnauthorized401(
  page: Page,
  urlPattern: string = '**/auth/v1/user*'
) {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 401,
        message: 'JWT expired / Invalid session token',
      }),
    });
  });
}

/**
 * 3G 슬로우 네트워크 지연 시뮬레이션 (응답을 delayMs 밀리초 지연 반환)
 */
export async function simulateSlowNetwork(
  page: Page,
  urlPattern: string = '**/rest/v1/rpc/get_user_memberships*',
  delayMs: number = 1500
) {
  await page.route(urlPattern, async (route: Route) => {
    // delayMs 동안 대기 후 원래 응답 또는 모의 데이터 전달
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          membership_id: 'mem-slow-1001',
          organization_id: 'aaaaaaaa-1111-4444-8888-000000000001',
          role: 'owner',
          organization_name: '모아 피아노 아카데미 (대치본점)',
          organization_industry_type: 'piano',
          organization_is_active: true,
          is_current_context: true,
        },
      ]),
    });
  });
}

/**
 * 네트워크 타임아웃 / 패킷 드롭 시뮬레이션
 */
export async function simulateNetworkTimeout(
  page: Page,
  urlPattern: string = '**/rest/v1/**'
) {
  await page.route(urlPattern, async (route: Route) => {
    await route.abort('timedout');
  });
}
