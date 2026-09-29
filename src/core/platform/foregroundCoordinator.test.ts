/**
 * foreground 조율 — 순서와 in-flight 가드.
 * 실행: npm run test:foreground-coordinator
 */
import assert from 'node:assert/strict';
import {
  registerForegroundStep,
  resetForegroundCoordinatorForTests,
  runForegroundResume,
} from './foregroundCoordinator';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  resetForegroundCoordinatorForTests();

  const order: string[] = [];
  registerForegroundStep('auth', async () => {
    order.push('auth');
    await delay(5);
  });
  registerForegroundStep('org', async () => {
    order.push('org');
  });
  registerForegroundStep('hydrate', async () => {
    order.push('hydrate');
  });
  registerForegroundStep('push', async () => {
    order.push('push');
  });

  await runForegroundResume();
  assert.deepEqual(order, ['auth', 'org', 'hydrate', 'push']);

  order.length = 0;
  let authRuns = 0;
  resetForegroundCoordinatorForTests();
  registerForegroundStep('auth', async () => {
    authRuns += 1;
    await delay(20);
    order.push(`auth-${authRuns}`);
  });
  registerForegroundStep('org', () => {
    order.push('org');
  });

  const first = runForegroundResume();
  const second = runForegroundResume();
  const third = runForegroundResume();
  await Promise.all([first, second, third]);
  assert.equal(authRuns, 2);
  assert.deepEqual(order, ['auth-1', 'org', 'auth-2', 'org']);

  resetForegroundCoordinatorForTests();
  console.log('foregroundCoordinator.test.ts: ok');
}

void run();
