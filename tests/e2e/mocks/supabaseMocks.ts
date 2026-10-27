import type { Page } from '@playwright/test';

export interface MockE2EContext {
  userId: string;
  userEmail: string;
  userName: string;
  orgId: string;
  orgName: string;
  orgCreated: boolean;
}

export const DEFAULT_MOCK_CONTEXT: MockE2EContext = {
  userId: '11111111-2222-3333-4444-555555555555',
  userEmail: 'director@moa.ac',
  userName: '김대표',
  orgId: '99999999-8888-7777-6666-555555555555',
  orgName: '모아 아카데미 대치점',
  orgCreated: false,
};

export async function setupE2EMocks(page: Page, context: Partial<MockE2EContext> = {}) {
  const ctx: MockE2EContext = { ...DEFAULT_MOCK_CONTEXT, ...context };

  // 1. Supabase REST/RPC Fallback Catch-all Mocking (LIFO 등록에 의해 최하위 우선순위)
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/rpc/get_my_parent_portal_tree')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ parent: null, children: [] }),
      });
      return;
    }
    if (url.includes('/rpc/ensure_global_parent_profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('parent-1001'),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // 2. Supabase Auth Mocking
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0yMjIyLTMzMzMtNDQ0NC01NTU1NTU1NTU1NTUiLCJlbWFpbCI6ImRpcmVjdG9yQG1vYS5hYyIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTM0MDIzMDA3OTl9.mock_signature',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-jwt-refresh-token',
        user: {
          id: ctx.userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: ctx.userEmail,
          email_confirmed_at: '2026-10-12T00:00:00Z',
          user_metadata: {
            full_name: ctx.userName,
          },
          app_metadata: {
            provider: 'email',
          },
        },
      }),
    });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: ctx.userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: ctx.userEmail,
        user_metadata: {
          full_name: ctx.userName,
        },
      }),
    });
  });

  // 3. 주소 검색 Edge Function Mocking
  await page.route('**/functions/v1/search-address*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            roadAddress: '서울특별시 강남구 테헤란로 123',
            fullAddress: '서울특별시 강남구 테헤란로 123 (역삼동)',
            jibun: '역삼동 825-1',
            postal: '06234',
            sido: '서울특별시',
            sigungu: '강남구',
            dong: '역삼동',
            buildingName: '모아빌딩',
          },
        ],
        totalCount: 1,
        currentPage: 1,
        countPerPage: 10,
      }),
    });
  });

  // 4. 조직 생성 RPC Mocking (구조화 주소 페이로드 유효성 검증)
  await page.route('**/rest/v1/rpc/create_organization*', async (route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    if (payload.p_name !== ctx.orgName) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Organization name mismatch' }),
      });
      return;
    }

    ctx.orgCreated = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ctx.orgId),
    });
  });

  // 5. 멤버십 목록 조회 RPC Mocking
  await page.route('**/rest/v1/rpc/get_user_memberships*', async (route) => {
    if (!ctx.orgCreated) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            membership_id: 'mem-1001',
            organization_id: ctx.orgId,
            role: 'owner',
            organization_name: ctx.orgName,
            organization_industry_type: 'piano',
            organization_is_active: true,
            is_current_context: true,
          },
        ]),
      });
    }
  });

  // 6. 커머스/재고 RPC Mocking (재고 입고, 포인트 수동 조정 등)
  await page.route('**/rest/v1/rpc/apply_stock_movement*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, movement_id: 'mov-1001' }),
    });
  });

  await page.route('**/rest/v1/rpc/apply_point_manual_adjust*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, transaction_id: 'pt-1001' }),
    });
  });

  await page.route('**/rest/v1/rpc/book_schedule_slot*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        reservation_id: 'res-1001',
      }),
    });
  });

  // 7. 기타 보조 RPC 및 REST Mocking
  await page.route('**/rest/v1/rpc/set_active_membership*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
  });

  await page.route('**/rest/v1/rpc/clear_active_membership*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
  });

  await page.route('**/rest/v1/rpc/get_owner_blocked_org_ids*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/rest/v1/locations*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'loc-1001',
          organization_id: ctx.orgId,
          name: '본점',
          is_default: true,
        },
      ]),
    });
  });

  return ctx;
}
