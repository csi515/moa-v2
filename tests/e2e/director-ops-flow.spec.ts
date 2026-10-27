import { test, expect } from '@playwright/test';
import { setupE2EMocks } from './mocks/supabaseMocks';
import { LoginPage, OrganizationSelectorPage, CreateOrganizationWizardPage } from './pages';

test.describe('Director Onboarding & Ops Flow (Moa v2)', () => {
  test('온보딩 Happy Path: 로그인 ➔ 사업장 주소 검색 모달 ➔ 상세주소 입력 ➔ 사업장 생성 (Mocked & POM)', async ({
    page,
  }) => {
    // 1. Supabase 네트워크 Mocking (중앙화 모듈)
    const mockCtx = await setupE2EMocks(page, {
      userId: '11111111-2222-3333-4444-555555555555',
      userEmail: 'director@moa.ac',
      userName: '김대표',
      orgName: '모아 아카데미 대치점',
    });

    const loginPage = new LoginPage(page);
    const orgSelectorPage = new OrganizationSelectorPage(page);
    const wizardModal = new CreateOrganizationWizardPage(page);

    // 2. 로그인 페이지 이동 및 글로벌 규격 로그인 폼 검증
    await loginPage.goto();
    await loginPage.expectVisible();

    // 3. 이메일 로그인 입력 및 제출
    await loginPage.loginWithEmail('director@moa.ac', 'Password123!');

    // 4. 사업장 선택 화면(온보딩 게이트) 진입 확인
    await orgSelectorPage.expectVisible();

    // 5. '새 사업장 등록하기' 클릭 -> 마법사 모달 오픈
    await orgSelectorPage.openCreateOrganizationWizard();
    await wizardModal.expectWizardVisible();

    // 6. 사업장 정보 입력
    await wizardModal.enterOrgName('모아 아카데미 대치점');

    // 7. 주소 검색 모달 오픈 -> 검색어 입력 및 결과 선택
    await wizardModal.searchAndSelectAddress('테헤란로', '서울특별시 강남구 테헤란로 123');

    // 8. 상세주소 입력
    await wizardModal.enterAddressDetail('3층 301호');

    // 9. 1단계 완료 -> 다음 단계 이동
    await wizardModal.proceedToNextStep();

    // 10. 2단계 출결 방식 선택 -> 등록하기 제출
    await wizardModal.submitCreation();

    // 11. 3단계 완료 화면 노출 및 사업장 진입 검증
    expect(mockCtx.orgCreated).toBe(true);
    await wizardModal.expectCompletionAndEnter();
  });
});
