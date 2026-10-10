import assert from 'node:assert';
import { isAppsInToss, detectPlatform } from './platformDetector';

// Sample User-Agents
const TOSS_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918N; Toss/5.120.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const TOSS_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TossApp/5.110.1';
const TOSS_INAPP_LOWER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 toss-webview/1.0.0';

const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DESKTOP_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15';
const DESKTOP_EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0';

const MOBILE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const MOBILE_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

console.log('--- Running platformDetector tests ---');

// 1. 토스 웹뷰 환경 감지 (User-Agent 기반)
assert.strictEqual(
  isAppsInToss(TOSS_ANDROID_UA),
  true,
  'Toss Android UA should be detected as Toss'
);
assert.strictEqual(
  isAppsInToss(TOSS_IOS_UA),
  true,
  'Toss iOS UA should be detected as Toss'
);
assert.strictEqual(
  isAppsInToss(TOSS_INAPP_LOWER_UA),
  true,
  'Toss Lowercase in-app UA should be detected as Toss'
);

// 2. 일반 데스크톱 브라우저 환경 감지
assert.strictEqual(
  isAppsInToss(DESKTOP_CHROME_UA),
  false,
  'Desktop Chrome should not be detected as Toss'
);
assert.strictEqual(
  isAppsInToss(DESKTOP_SAFARI_UA),
  false,
  'Desktop Safari should not be detected as Toss'
);
assert.strictEqual(
  isAppsInToss(DESKTOP_EDGE_UA),
  false,
  'Desktop Edge should not be detected as Toss'
);

// 3. 일반 모바일 브라우저 환경 감지
assert.strictEqual(
  isAppsInToss(MOBILE_SAFARI_UA),
  false,
  'Mobile Safari should not be detected as Toss'
);
assert.strictEqual(
  isAppsInToss(MOBILE_CHROME_UA),
  false,
  'Mobile Chrome should not be detected as Toss'
);

// 4. 브릿지 주입 플래그 동작 검증
assert.strictEqual(
  isAppsInToss(DESKTOP_CHROME_UA, true),
  true,
  'Explicit hasBridge=true should override UA and return true'
);
assert.strictEqual(
  isAppsInToss(TOSS_ANDROID_UA, false),
  true,
  'Explicit hasBridge=false with Toss UA should still detect Toss via UA'
);
assert.strictEqual(
  isAppsInToss(DESKTOP_CHROME_UA, false),
  false,
  'Explicit hasBridge=false with Chrome UA should return false'
);

// 5. 빈 문자열 및 엣지 케이스
assert.strictEqual(isAppsInToss(''), false, 'Empty string UA should return false');
assert.strictEqual(isAppsInToss(undefined, false), false, 'Undefined UA with hasBridge=false should return false');

// 6. detectPlatform 헬퍼 함수 검증
assert.strictEqual(
  detectPlatform({ userAgent: TOSS_IOS_UA }),
  'toss',
  'detectPlatform with Toss UA should return toss'
);
assert.strictEqual(
  detectPlatform({ userAgent: DESKTOP_CHROME_UA }),
  'web',
  'detectPlatform with Chrome UA should return web'
);
assert.strictEqual(
  detectPlatform({ userAgent: DESKTOP_CHROME_UA, hasBridge: true }),
  'toss',
  'detectPlatform with hasBridge=true should return toss'
);

console.log('platformDetector.test.ts: ok (all test cases passed)');
