/**
 * 딥링크 파서 단위 테스트
 * 실행: npx tsx src/core/platform/deepLinkParser.test.ts
 */
import assert from 'node:assert/strict';
import {
  formatGuardianLinkCode,
  isValidGuardianLinkCode,
  normalizeGuardianLinkCode,
  parseDeepLinksFromUrl,
  parseGuardianLinkCode,
  parseStaffLinkCode,
} from './deepLinkParser';
import { resolveAppBaseUrl } from './appBaseUrl';

const V2 = '7K3M9QZX2B4D6F8H1JNP';

function run(): void {
  // 기존 8자리 코드 (만료 전 발송분 호환)
  const legacy = parseDeepLinksFromUrl('https://app.example.com/?link=ab12cd34');
  assert.equal(legacy.guardianLink, 'AB12CD34');
  assert.equal(legacy.staffLink, null);

  // 새 20자리 Crockford 코드 (하이픈·소문자 허용)
  const g = parseDeepLinksFromUrl(`https://app.example.com/?link=${V2.toLowerCase().replace(/(.{4})(?=.)/g, '$1-')}`);
  assert.equal(g.guardianLink, V2);

  // Crockford 혼동 문자 보정
  assert.equal(normalizeGuardianLinkCode('o1il-abcd'), '0111ABCD');
  assert.equal(parseGuardianLinkCode('7K3M9QZX2B4D6F8HIJNP'), '7K3M9QZX2B4D6F8H1JNP');

  // 잘못된 길이/문자
  assert.equal(parseDeepLinksFromUrl('https://app.example.com/?link=ABC123').guardianLink, null);
  assert.equal(parseDeepLinksFromUrl('https://app.example.com/?link=AA').guardianLink, null);
  assert.equal(parseGuardianLinkCode(`${V2}X`), null);
  assert.equal(parseGuardianLinkCode('7K3M9QZX2B4D6F8H1JNU'), null, 'U is not Crockford');
  assert.equal(isValidGuardianLinkCode('ABCDEFGH'), true);
  assert.equal(isValidGuardianLinkCode(''), false);

  assert.equal(formatGuardianLinkCode(V2), '7K3M-9QZX-2B4D-6F8H-1JNP');
  assert.equal(formatGuardianLinkCode('AB12CD34'), 'AB12CD34');

  // 교직원 초대 코드: 영숫자 8~64자
  const s = parseDeepLinksFromUrl('https://app.example.com/?staff_link=abcd-efgh-jk23');
  assert.equal(s.staffLink, 'ABCDEFGHJK23');
  assert.equal(s.guardianLink, null);
  assert.equal(parseDeepLinksFromUrl('https://app.example.com/?staff_link=STAFF001').staffLink, 'STAFF001');
  assert.equal(parseStaffLinkCode('xyz789'), null);

  const both = parseDeepLinksFromUrl(`https://app.example.com/?link=${V2}&staff_link=STAFF001`);
  assert.equal(both.guardianLink, V2);
  assert.equal(both.staffLink, 'STAFF001');

  const bad = parseDeepLinksFromUrl('not-a-url');
  assert.equal(bad.guardianLink, null);
  assert.equal(bad.staffLink, null);

  // 공개 앱 URL: 네이티브는 VITE_APP_URL, 웹은 origin 우선
  assert.equal(
    resolveAppBaseUrl({ native: true, origin: 'capacitor://localhost', envUrl: 'https://moa.example.com/' }),
    'https://moa.example.com'
  );
  assert.equal(
    resolveAppBaseUrl({ native: true, origin: 'https://localhost', envUrl: 'https://moa.example.com' }),
    'https://moa.example.com'
  );
  assert.equal(resolveAppBaseUrl({ native: true, origin: 'https://localhost', envUrl: '' }), '');
  assert.equal(
    resolveAppBaseUrl({ native: false, origin: 'https://preview.example.com', envUrl: 'https://moa.example.com' }),
    'https://preview.example.com'
  );
  assert.equal(
    resolveAppBaseUrl({ native: false, origin: 'capacitor://localhost', envUrl: 'https://moa.example.com' }),
    'https://moa.example.com'
  );

  console.log('deepLinkParser.test.ts: all assertions passed');
}

run();
