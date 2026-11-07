import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

async function runTests() {
  console.log('Running MobileLoginForm & Social Auth verification tests...');

  // 1. MobileLoginForm.tsx exists
  const componentPath = join(root, 'src/components/auth/MobileLoginForm.tsx');
  assert.ok(existsSync(componentPath), 'MobileLoginForm.tsx must exist');
  const code = readFileSync(componentPath, 'utf8');

  // 2. Desktop 2-column <-> Mobile single card responsive layout (verified via LoginPage container)
  const loginPagePath = join(root, 'src/pages/auth/LoginPage.tsx');
  assert.ok(existsSync(loginPagePath), 'LoginPage.tsx must exist');
  const loginPageCode = readFileSync(loginPagePath, 'utf8');

  assert.match(
    loginPageCode,
    /flex-col\s+lg:flex-row/,
    'LoginPage must support mobile single card (flex-col) to desktop 2-column (lg:flex-row)'
  );
  assert.match(
    loginPageCode,
    /hidden\s+lg:flex/,
    'Desktop branding panel must be hidden on mobile and flex on lg screens'
  );
  assert.match(
    loginPageCode,
    /data-testid=["']desktop-brand-panel["']/,
    'Desktop brand panel test ID must exist'
  );

  // 3. Domestic SNS login: Kakao & Naver (2 columns grid) before email form
  const kakaoIndex = code.indexOf('data-testid="btn-kakao-login"');
  const naverIndex = code.indexOf('data-testid="btn-naver-login"');
  const emailFormIndex = code.indexOf('data-testid="btn-email-submit"');

  assert.ok(kakaoIndex >= 0, 'Kakao login button must exist');
  assert.ok(naverIndex >= 0, 'Naver login button must exist');
  assert.ok(emailFormIndex >= 0, 'Email submit button must exist');

  assert.ok(
    kakaoIndex < emailFormIndex && naverIndex < emailFormIndex,
    'Kakao & Naver buttons must appear BEFORE email form'
  );

  // Kakao & Naver must be in 2-column grid
  assert.match(
    code,
    /grid\s+grid-cols-2\s+gap-(?:2\.5|3)/,
    'Kakao and Naver must be arranged in a 2-column grid'
  );

  // Google & Apple buttons must be removed
  assert.equal(
    code.includes('data-testid="btn-google-login"'),
    false,
    'Google login button must be removed'
  );
  assert.equal(
    code.includes('data-testid="btn-apple-login"'),
    false,
    'Apple login button must be removed'
  );

  // 4. SNS OAuth login activated
  assert.match(
    code,
    /SNS_LOGIN_ENABLED\s*=\s*true/,
    'SNS_LOGIN_ENABLED must be true now that OAuth is wired'
  );

  // 5. Signup / forgot entry points on login form
  assert.match(
    code,
    /data-testid=["']link-signup["']/,
    'MobileLoginForm must expose a signup link'
  );
  assert.match(
    code,
    /to=["']\/signup["']/,
    'Signup link must navigate to /signup'
  );
  assert.match(
    code,
    /data-testid=["']link-forgot-password["']/,
    'MobileLoginForm must expose a forgot-password link'
  );
  assert.match(
    code,
    /to=["']\/signup\?mode=forgot["']/,
    'Forgot-password link must navigate to /signup?mode=forgot'
  );

  // 5b. LoginPage must surface auth failure on success:false (Refine contract)
  assert.match(
    loginPageCode,
    /!data\?\.success/,
    'LoginPage must check data.success before navigating after login'
  );
  assert.match(
    loginPageCode,
    /mapLoginErrorMessage/,
    'LoginPage must map login errors for Korean user feedback'
  );
  assert.doesNotMatch(
    loginPageCode,
    /Project Moa v2/,
    'LoginPage must not show Project Moa v2 branding'
  );

  // 5c. LoginPage integration check
  assert.match(
    loginPageCode,
    /<MobileLoginForm/,
    'LoginPage.tsx must mount MobileLoginForm component'
  );
  assert.match(
    loginPageCode,
    /rememberMe=\{rememberMe\}/,
    'LoginPage.tsx must bind rememberMe state to MobileLoginForm'
  );
  assert.match(
    loginPageCode,
    /onRememberMeChange=\{setRememberMe\}/,
    'LoginPage.tsx must bind onRememberMeChange to MobileLoginForm'
  );
  assert.match(
    loginPageCode,
    /login\(\s*\{\s*email,\s*password,\s*rememberMe\s*\}/,
    'LoginPage.tsx must pass rememberMe in login payload'
  );
  assert.match(
    loginPageCode,
    /onLoginTargetGroupChange=\{setLoginTargetGroup\}/,
    'LoginPage must bind the workplace/customer choice used after login'
  );
  assert.match(
    loginPageCode,
    /readLoginReturnPath/,
    'LoginPage must accept both returnUrl and Refine to query params'
  );

  // 6. authService support for Google and Apple OAuth & rememberMe session partitioning
  const authServicePath = join(root, 'src/core/auth/services/authService.ts');
  const authServiceCode = readFileSync(authServicePath, 'utf8');
  assert.match(
    authServiceCode,
    /export async function signInWithGoogle/,
    'authService must export signInWithGoogle'
  );
  assert.match(
    authServiceCode,
    /export async function signInWithApple/,
    'authService must export signInWithApple'
  );
  assert.match(
    authServiceCode,
    /rememberMe\?: boolean/,
    'authService.SignInParams must support rememberMe optional flag'
  );
  assert.match(
    authServiceCode,
    /setAuthStoragePreference\(rememberMe\)/,
    'authService.signIn must apply setAuthStoragePreference when rememberMe is provided'
  );

  // 7. Dynamic Auth Storage module check
  const authStoragePath = join(root, 'src/core/auth/services/authStorage.ts');
  assert.ok(existsSync(authStoragePath), 'authStorage.ts must exist');
  const authStorageCode = readFileSync(authStoragePath, 'utf8');
  assert.match(
    authStorageCode,
    /export const dynamicAuthStorage/,
    'authStorage.ts must export dynamicAuthStorage adapter'
  );
  assert.match(
    authStorageCode,
    /sessionStorage/,
    'dynamicAuthStorage must leverage sessionStorage for shared kiosk partitioning'
  );

  console.log('MobileLoginForm & Social Auth tests passed successfully!');
}

void runTests();
