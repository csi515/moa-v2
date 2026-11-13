import { expect, type Page, type Locator } from '@playwright/test';

export class CreateOrganizationWizardPage {
  readonly page: Page;
  readonly orgNameInput: Locator;
  readonly addressSearchBtn: Locator;
  readonly addressManualModeBtn: Locator;
  readonly addressSearchKeywordInput: Locator;
  readonly addressSearchSubmitBtn: Locator;
  readonly addressRoadInput: Locator;
  readonly addressDetailInput: Locator;
  readonly nextBtn: Locator;
  readonly skipRoomsBtn: Locator;
  readonly submitBtn: Locator;
  readonly enterBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orgNameInput = page.getByTestId('input-org-name');
    this.addressSearchBtn = page.getByTestId('btn-address-search');
    this.addressManualModeBtn = page.getByTestId('btn-address-manual-mode');
    this.addressSearchKeywordInput = page.getByTestId('input-address-search-keyword');
    this.addressSearchSubmitBtn = page.getByTestId('btn-address-search-submit');
    this.addressRoadInput = page.getByTestId('input-address-road');
    this.addressDetailInput = page.getByTestId('input-address-detail');
    this.nextBtn = page.getByTestId('btn-wizard-next');
    this.skipRoomsBtn = page.getByTestId('btn-wizard-skip-rooms');
    this.submitBtn = page.getByTestId('btn-wizard-submit');
    this.enterBtn = page.getByTestId('btn-wizard-enter');
  }

  async expectWizardVisible() {
    // Step 0(업종 선택)이면 다음으로 진행해 사업장 정보 입력 단계로 진입
    const isNameInputVisible = await this.orgNameInput.isVisible().catch(() => false);
    if (!isNameInputVisible) {
      await expect(this.nextBtn).toBeVisible({ timeout: 10000 });
      await this.nextBtn.click();
    }
    await expect(this.orgNameInput).toBeVisible({ timeout: 10000 });
  }

  async enterOrgName(name: string) {
    await this.orgNameInput.fill(name);
  }

  /**
   * 주소 검색 모달 → 직접 입력 경로로 도로명 주소를 확정한다.
   * (카카오 우편번호 임베드는 E2E에서 외부 스크립트 의존이 있어 우회)
   */
  async searchAndSelectAddress(keyword: string, expectedRoadAddress: string) {
    await this.addressSearchBtn.click();
    await expect(this.addressManualModeBtn).toBeVisible({ timeout: 10000 });
    await this.addressManualModeBtn.click();

    await expect(this.addressSearchKeywordInput).toBeVisible();
    await this.addressSearchKeywordInput.fill(expectedRoadAddress || keyword);
    await this.addressSearchSubmitBtn.click();

    await expect(this.addressRoadInput).toHaveValue(expectedRoadAddress, { timeout: 10000 });
  }

  async enterAddressDetail(detail: string) {
    await expect(this.addressDetailInput).toBeEnabled();
    await this.addressDetailInput.fill(detail);
  }

  /** 사업장 정보 → 강의실 스텝 이동 */
  async proceedToNextStep() {
    await this.nextBtn.click();
  }

  /** 강의실 스텝 건너뛰고 개설 완료까지 진행 */
  async skipRoomsAndFinish() {
    await expect(this.skipRoomsBtn).toBeVisible({ timeout: 10000 });
    await this.skipRoomsBtn.click();
  }

  async submitCreation() {
    await expect(this.submitBtn).toBeVisible();
    await this.submitBtn.click();
  }

  async expectCompletionAndEnter() {
    await expect(this.enterBtn).toBeVisible({ timeout: 15000 });
    await this.enterBtn.click();
  }
}
