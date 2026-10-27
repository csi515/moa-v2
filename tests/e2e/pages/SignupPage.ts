import { expect, type Page, type Locator } from '@playwright/test';

export class SignupPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('signup-name-input');
    this.emailInput = page.getByTestId('signup-email-input');
    this.passwordInput = page.getByTestId('signup-password-input');
    this.termsCheckbox = page.getByTestId('signup-terms-checkbox');
    this.submitBtn = page.getByTestId('signup-submit-btn');
  }

  async goto() {
    await this.page.goto('/signup', { waitUntil: 'domcontentloaded' });
  }

  async expectVisible() {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitBtn).toBeVisible();
  }

  async fillSignupForm(name: string, email: string, pass: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.termsCheckbox.check();
  }

  async submit() {
    await this.submitBtn.click();
  }
}
