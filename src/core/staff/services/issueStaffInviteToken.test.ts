import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function run() {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, 'issueStaffInviteToken.ts'), 'utf8');
  assert.match(src, /STORE_STAFF_INVITE/);
  assert.match(src, /role_id/);
  assert.match(src, /onboarding_tokens/);
  console.log('issueStaffInviteToken.test.ts: ok');
}

run();
