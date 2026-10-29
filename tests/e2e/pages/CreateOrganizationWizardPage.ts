import { expect, type Page, type Locator } from '@playwright/test';

export class CreateOrganizationWizardPage {
  readonly page: Page;
  readonly orgNameInput: Locator;
  readonly addressSearchBtn: Locator;
  readonly addressSearchKeywordInput: Locator;
  readonly addressSearchSubmitBtn: Locator;
  readonly addressSearchResultItem: Locator;
  readonly addressRoadInput: Locator;
  readonly addressDetailInput: Locator;
  readonly nextBtn: Locator;
  readonly submitBtn: Locator;
  readonly enterBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orgNameInput = page.getByTestId('input-org-name');
    this.addressSearchBtn = page.getByTestId('btn-address-search');
    this.addressSearchKeywordInput = page.getByTestId('input-address-search-keyword');
    this.addressSearchSubmitBtn = page.getByTestId('btn-address-search-submit');
    this.addressSearchResultItem = page.getByTestId('item-address-search-result');
    this.addressRoadInput = page.getByTestId('input-address-road');
    this.addressDetailInput = page.getByTestId('input-address-detail');
    this.nextBtn = page.getByTestId('btn-wizard-next');
    this.submitBtn = page.getByTestId('btn-wizard-submit').or(page.getByTestId('btn-wizard-next'));
    this.enterBtn = page.getByTestId('btn-wizard-enter');
  }

  async expectWizardVisible() {
    const isNextBtnVisible = await this.nextBtn.isVisible().catch(() => false);
    const isNameInputVisible = await this.orgNameInput.isVisible().catch(() => false);
    if (isNextBtnVisible && !isNameInputVisible) {
      await this.nextBtn.click();
    }
    await expect(this.orgNameInput).toBeVisible();
  }

  async enterOrgName(name: string) {
    await this.orgNameInput.fill(name);
  }

  async searchAndSelectAddress(keyword: string, expectedRoadAddress: string) {
    await this.addressSearchBtn.click();
    await expect(this.addressSearchKeywordInput).toBeVisible();
    await this.addressSearchKeywordInput.fill(keyword);
    await this.addressSearchSubmitBtn.click();

    const result = this.addressSearchResultItem.first();
    await expect(result).toBeVisible();
    await result.click();

    await expect(this.addressRoadInput).toHaveValue(expectedRoadAddress);
  }

  async enterAddressDetail(detail: string) {
    await this.addressDetailInput.fill(detail);
  }

  async proceedToNextStep() {
    await this.nextBtn.click();
  }

  async submitCreation() {
    await expect(this.submitBtn).toBeVisible();
    await this.submitBtn.click();
  }

  async expectCompletionAndEnter() {
    await expect(this.enterBtn).toBeVisible();
    await this.enterBtn.click();
  }
}
