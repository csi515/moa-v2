import type { Page } from '@playwright/test';

const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** CI에서 환경변수가 없어도 테넌트·세션을 브라우저 저장소에 심는다. */
export async function injectAuthContext(page: Page): Promise<void> {
  const orgId = process.env.E2E_ORG_ID || TENANT_ID;
  const userId = process.env.E2E_USER_ID || '11111111-2222-3333-4444-555555555555';
  await page.addInitScript(
    ({ orgId, userId }) => {
      const user = {
        id: userId,
        email: 'owner@moa.local',
        name: '사업주',
        role: 'owner',
        permissions: ['shuttle:dispatch:operate', 'shuttle:routes:manage', 'shuttle:logs:read'],
      };
      window.localStorage.setItem('moa.activeOrganizationId', orgId);
      window.localStorage.setItem('moa.activeUser', JSON.stringify(user));
      window.sessionStorage.setItem('moa.e2e', '1');
    },
    { orgId, userId }
  );
}
