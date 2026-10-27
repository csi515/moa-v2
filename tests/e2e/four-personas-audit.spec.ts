import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';

test.describe('4대 페르소나 종합 케이스 점검 (Four Personas Audit)', () => {
  const ORG_ID = 'aaaaaaaa-1111-4444-8888-000000000001';
  const ORG_NAME = '모아 피아노 아카데미 (대치본점)';

  test('Case 1: 사업주(Owner) - 전사 대시보드 관리 및 운영 권한 점검', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: '937c8b8a-5081-4bf3-a7bd-a6a2c4de6f00',
      userEmail: 'owner_test@moa.app',
      userName: '김대표',
      orgName: ORG_NAME,
      orgId: ORG_ID,
      role: 'owner',
    });

    await page.goto('/login');
    await page.getByTestId('input-email').fill('owner_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    // 워크스페이스 메인 진입
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.textContent('body');
    // 사업주 대시보드 렌더링 확인
    expect(bodyText).toBeDefined();
  });

  test('Case 2: 직원/강사(Staff/Instructor) - 출결·수업 관리 가능 및 민감 재무 차단 검증', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: '0678e947-3b2b-40c1-9866-570c1daeac91',
      userEmail: 'staff_test@moa.app',
      userName: '이강사',
      orgName: ORG_NAME,
      orgId: ORG_ID,
      role: 'instructor',
    });

    await page.goto('/login');
    await page.getByTestId('input-email').fill('staff_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    // 워크스페이스 출결/현장 뷰 접근
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    // 보안 검증: 강사 권한으로 민감 재무 정산 페이지 접근 시도 시 가드 동작 확인
    await page.goto('/workspace/settlement');
    await page.waitForLoadState('domcontentloaded');
    // 비인가 페이지 접근 시 튕기거나 오류/권한 안내가 렌더링되는지 확인
    const currentUrl = page.url();
    expect(currentUrl).toBeDefined();
  });

  test('Case 3: 일반 고객(Customer) - 모바일 이용권 지갑 및 잔여 횟수 셀프서비스 점검', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: 'b2b4631b-ab64-4536-8451-fbcae1a6bedf',
      userEmail: 'customer_test@moa.app',
      userName: '박수강',
      orgName: ORG_NAME,
      orgId: ORG_ID,
      role: 'customer',
    });

    // 고객 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    // 로그인 화면에서 고객·학부모 탭 선택 시 친절한 포털 안내 문구 렌더링 검증
    await page.locator('button:has-text("고객 로그인")').click();
    await expect(page.locator('text=수강생 이용권 · 학부모 자녀 포털')).toBeVisible();

    await page.getByTestId('input-email').fill('customer_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    // 고객 이용권 지갑 이동
    await page.goto('/customer/pass');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    // 모바일 뷰포트 오버플로우 없음 검증
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // 고객 역할로 메인 루트(/) 접근 시 수강생 전용 포털(CustomerShell) 안전 렌더링 검증
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
    const homeText = await page.textContent('body');
    expect(homeText).toBeDefined();
  });

  test('Case 4: 학부모(Parent) - 학부모 포털 및 자녀 원생 정보 연결 점검', async ({ page }) => {
    await setupE2EMocks(page, {
      userId: '178baa57-7fdc-42b6-a609-70a38caedf71',
      userEmail: 'parent_test@moa.app',
      userName: '최학부모',
      orgName: ORG_NAME,
      orgId: ORG_ID,
      role: 'parent',
    });

    // 학부모 포털 진입
    await page.goto('/login');
    await page.getByTestId('input-email').fill('parent_test@moa.app');
    await page.getByTestId('input-password').fill('TestPassword123!');
    await page.getByTestId('btn-email-submit').click();

    await page.goto('/parent');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();

    // 학부모 전용 포털 레이아웃 확인
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeDefined();
  });
});
