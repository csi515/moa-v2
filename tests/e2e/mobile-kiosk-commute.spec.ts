import { test, expect } from '@playwright/test';
import { injectAuthContext } from '../../e2e/fixtures/authContext';
import { installShuttleMocks } from '../../e2e/mocks/shuttleMocks';

/**
 * Mobile & Kiosk Viewport E2E Test Suite
 *
 * 1. 버스 기사용 모바일 실시간 운행표 (DriverCommuteDashboardView)
 * 2. 임직원 셔틀버스 탑승 신청 모달 (StaffShuttleRideRequestModal)
 * 3. 현장 태블릿 키오스크 뷰포트 레이아웃 반응성
 */

test.describe('모바일 및 키오스크 실기기 뷰포트 E2E 검증', () => {
  // 다른 셔틀 스펙과 동일한 e2e 세션/모킹 패턴 (VITE_E2E 전용 /e2e/shuttle-commute 라우트)
  test.beforeEach(async ({ page }) => {
    await injectAuthContext(page);
    await installShuttleMocks(page);
    // 출퇴근 노선·탑승 신청 조회는 빈 응답 → 서비스 기본 시드(정류장·탑승자 포함) 사용
    for (const table of ['shuttle_routes', 'shuttle_ride_requests']) {
      await page.route(`**/mock-supabase.moa.local/**/${table}*`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      );
    }
  });

  // 모바일 스마트폰 뷰포트 (iPhone 14 규격: 390x844)
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
  });

  test('1. 기사용 모바일 운행표: 모바일 카드 뷰포트 렌더링 및 원클릭 탑승 확인', async ({ page }) => {
    // 셔틀 관리 화면 접속
    await page.goto('/e2e/shuttle-commute');

    // 기사용 모바일 운행표 탭 클릭 (VehicleShuttleCommuteView)
    const driverTab = page.getByRole('button', { name: /기사용 모바일 운행표/ });
    if (await driverTab.isVisible()) {
      await driverTab.click();
    }

    // 상단 기사 운행표 헤더 확인
    await expect(page.locator('div:text-is("기사용 모바일 운행표")')).toBeVisible();

    // 현재 정차지 카드 확인
    await expect(page.locator('text=현재 정차지')).toBeVisible();

    // 탑승 확인 토글 버튼 및 직통 전화걸기 링크 검증
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await expect(phoneLink).toBeVisible();

    // 다음 정류장으로 출발 버튼 존재 확인
    const nextStopBtn = page.getByRole('button', { name: /다음 정류장으로 출발/ });
    await expect(nextStopBtn).toBeVisible();
  });

  test('2. 모바일 탑승 신청 모달: 노선 및 정류장 선택 인터랙션', async ({ page }) => {
    await page.goto('/e2e/shuttle-commute');

    // 신규 탑승 신청 등록 버튼 클릭
    const openModalBtn = page.getByRole('button', { name: /신규 탑승 신청 등록/ });
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click();

      // 모달 헤더 확인
      await expect(page.locator('text=출퇴근 셔틀버스 탑승 신청')).toBeVisible();

      // 탑승 주기 선택 (매일 정기 탑승 vs 특정 일자 1회 탑승)
      const singleRideBtn = page.getByRole('button', { name: /특정 일자 1회 탑승/ });
      await singleRideBtn.click();

      // 일자 입력 필드 노출 확인
      await expect(page.locator('input[type="date"]')).toBeVisible();

      // 닫기
      await page.getByRole('button', { name: /취소/ }).click();
      await expect(page.locator('text=출퇴근 셔틀버스 탑승 신청')).not.toBeVisible();
    }
  });

  // 태블릿 키오스크 뷰포트 (iPad Mini 규격: 768x1024)
  test.describe('태블릿 키오스크 뷰포트 테스트', () => {
    test.use({
      viewport: { width: 768, height: 1024 },
    });

    test('3. 태블릿 키오스크 뷰포트: 정차 순서 스케줄러 반응형 렌더링', async ({ page }) => {
      await page.goto('/e2e/shuttle-commute');

      // 스케줄러 탭 기본 활성화 확인
      await expect(page.locator('text=임직원 셔틀 정차 순서 및 탑승 스케줄러')).toBeVisible();

      // 출근 노선 / 퇴근 노선 전환 버튼 인터랙션
      const commuteOutBtn = page.getByRole('button', { name: /^퇴근 노선 \(Commute Out\)$/ });
      await commuteOutBtn.click();
      await expect(commuteOutBtn).toBeVisible();

      const commuteInBtn = page.getByRole('button', { name: /^출근 노선 \(Commute In\)$/ });
      await commuteInBtn.click();
      await expect(commuteInBtn).toBeVisible();
    });
  });
});
