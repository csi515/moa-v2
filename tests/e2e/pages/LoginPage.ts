import { expect, type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly container: Locator;
  readonly googleBtn: Locator;
  readonly appleBtn: Locator;
  readonly kakaoBtn: Locator;
  readonly naverBtn: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('login-container');
    this.googleBtn = page.getByTestId('btn-google-login');
    this.appleBtn = page.getByTestId('btn-apple-login');
    this.kakaoBtn = page.getByTestId('btn-kakao-login');
    this.naverBtn = page.getByTestId('btn-naver-login');
    this.emailInput = page.getByTestId('input-email');
    this.passwordInput = page.getByTestId('input-password');
    this.submitBtn = page.getByTestId('btn-email-submit');
  }

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async expectVisible() {
    await expect(this.container).toBeVisible();
    await expect(this.googleBtn).toBeVisible();
    await expect(this.appleBtn).toBeVisible();
    await expect(this.kakaoBtn).toBeVisible();
    await expect(this.naverBtn).toBeVisible();
  }

  async loginWithEmail(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitBtn.click();
  }
}
