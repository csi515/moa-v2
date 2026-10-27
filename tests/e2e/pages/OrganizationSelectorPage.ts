import { expect, type Page, type Locator } from '@playwright/test';

export class OrganizationSelectorPage {
  readonly page: Page;
  readonly selector: Locator;
  readonly openWizardBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.selector = page.getByTestId('organization-selector');
    this.openWizardBtn = page.getByTestId('btn-open-create-org-wizard');
  }

  async expectVisible() {
    await expect(this.selector).toBeVisible();
  }

  async openCreateOrganizationWizard() {
    await this.openWizardBtn.click();
  }
}
