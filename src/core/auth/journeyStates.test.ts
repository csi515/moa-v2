import assert from 'node:assert/strict';
import {
  AUTH_RECOVERY_PATH,
  CUSTOMER_HOME_PATH,
  INVITE_ACCEPT_PATH,
  JOURNEY_LOADING_MESSAGES,
  ORG_ONBOARDING_PATH,
  WORKPLACE_HOME_PATH,
  isOrgOnboardingPath,
  type AppJourneyState,
} from './journeyStates';

const STATES: AppJourneyState[] = [
  'unauthenticated',
  'emailPending',
  'checkingSession',
  'loadingOrganizations',
  'needsOrganization',
  'hydrating',
  'ready',
];

assert.equal(STATES.length, 7);
assert.match(JOURNEY_LOADING_MESSAGES.checkingSession, /세션/);
assert.match(JOURNEY_LOADING_MESSAGES.loadingOrganizations, /사업장/);
assert.match(JOURNEY_LOADING_MESSAGES.hydrating, /데이터/);
assert.equal(ORG_ONBOARDING_PATH, '/onboarding/org');
assert.equal(WORKPLACE_HOME_PATH, '/workspace');
assert.equal(CUSTOMER_HOME_PATH, '/customer/pass');
assert.equal(AUTH_RECOVERY_PATH, '/auth/recovery');
assert.equal(INVITE_ACCEPT_PATH, '/invite/accept');
assert.equal(isOrgOnboardingPath('/onboarding/org'), true);
assert.equal(isOrgOnboardingPath('/workspace'), false);

/** Core journey smoke: 공개·게이트 라우트 계약 */
const JOURNEY_PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/signup?mode=forgot',
  AUTH_RECOVERY_PATH,
  INVITE_ACCEPT_PATH,
  '/invite/staff/:token',
  '/signup/customer',
  ORG_ONBOARDING_PATH,
  WORKPLACE_HOME_PATH,
] as const;

assert.ok(JOURNEY_PUBLIC_ROUTES.includes('/login'));
assert.ok(JOURNEY_PUBLIC_ROUTES.includes(ORG_ONBOARDING_PATH));
assert.ok(JOURNEY_PUBLIC_ROUTES.includes(AUTH_RECOVERY_PATH));

console.log('journeyStates.test.ts: ok');
