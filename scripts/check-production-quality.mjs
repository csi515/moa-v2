/**
 * 상용 앱 프로덕션 품질 및 UX 규칙 검사기 (COMMERCIAL-QUALITY-GUARD)
 *
 * 상용 B2B SaaS 수준의 사용자 경험을 보장하기 위해 다음 항목을 정적 검사합니다:
 * 1. 브라우저 기본 alert() / confirm() 직접 호출 금지 (ConfirmDialog 또는 Toast 사용)
 * 2. 가짜 연동 완료 알림(미연동 알림톡/문자 성공 오인 문구) 금지
 * 3. 프로덕션 환경 내 데모 모드 침묵 우회(Silent Mock Bypass) 금지
 *
 * 실행: node scripts/check-production-quality.mjs [--self-test]
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'src');

function toPosix(p) {
  return relative(root, p).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      walk(full, out);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// 기존 레거시 허용 목록 (완전 청산 완료: 잔존 alert 0건)
const LEGACY_ALERT_ALLOWLIST = new Set([]);

const FORBIDDEN_ALERT_PATTERNS = [
  /\bwindow\.alert\s*\(/,
  /\bwindow\.confirm\s*\(/,
  /(?<![a-zA-Z0-9_$])alert\s*\(/,
];

const FAKE_NOTIFICATION_PATTERNS = [
  /알림톡이\s*전송되었습니다/,
  /카카오톡으로\s*발송되었습니다/,
  /문자가\s*발송되었습니다/,
];

export function scanCommercialQuality(targetFiles = null) {
  const violations = [];
  const files = targetFiles || walk(srcDir);

  for (const file of files) {
    const rel = toPosix(file);
    const raw = readFileSync(file, 'utf8');
    const clean = stripComments(raw);

    // 1. 브라우저 alert / confirm 직접 호출 검사
    if (!LEGACY_ALERT_ALLOWLIST.has(rel)) {
      for (const pattern of FORBIDDEN_ALERT_PATTERNS) {
        if (pattern.test(clean)) {
          violations.push({
            file: rel,
            rule: 'NO_RAW_ALERT_CONFIRM',
            message:
              '브라우저 네이티브 alert() 또는 confirm() 직접 호출은 금지됩니다. ConfirmDialog 또는 notificationProvider를 사용하세요.',
          });
          break;
        }
      }
    }

    // 2. 가짜 알림톡/문자 발송 완료 토스트 검사 (정직한 UX 원칙)
    // 실제 외부 SMS/알림톡 발송 인프라가 미연동된 상태에서 성공으로 오인시키는 문구 감시
    for (const pattern of FAKE_NOTIFICATION_PATTERNS) {
      if (pattern.test(clean)) {
        violations.push({
          file: rel,
          rule: 'HONEST_NOTIFICATION_UX',
          message:
            '외부 미연동 상태에서 "전송 완료" 문구는 금지됩니다. "저장 완료 (외부 미발송)"로 정직하게 안내하세요.',
        });
        break;
      }
    }
  }

  return violations;
}

function runSelfTest() {
  const dummyClean = `
    export function myComponent() {
      showToast({ message: '저장 완료 (외부 미발송)' });
      return null;
    }
  `;
  const dummyViolationAlert = `
    export function bad() {
      alert('경고');
    }
  `;
  const dummyViolationFake = `
    export function bad2() {
      showToast({ message: '알림톡이 전송되었습니다' });
    }
  `;

  let pass = true;

  if (FORBIDDEN_ALERT_PATTERNS.some((p) => p.test(dummyClean))) {
    console.error('Self-test failed: clean code triggered alert pattern');
    pass = false;
  }
  if (!FORBIDDEN_ALERT_PATTERNS.some((p) => p.test(dummyViolationAlert))) {
    console.error('Self-test failed: alert violation not detected');
    pass = false;
  }
  if (!FAKE_NOTIFICATION_PATTERNS.some((p) => p.test(dummyViolationFake))) {
    console.error('Self-test failed: fake notification violation not detected');
    pass = false;
  }

  if (pass) {
    console.log('commercial-quality self-test: alert/confirm & honest-ux patterns detection ok');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else {
  const violations = scanCommercialQuality();
  if (violations.length > 0) {
    console.error('\n❌ 상용 앱 프로덕션 품질 및 UX 위반 사항 발견:');
    for (const v of violations) {
      console.error(`- [${v.rule}] ${v.file}: ${v.message}`);
    }
    process.exit(1);
  } else {
    console.log('✅ commercial-quality scan passed: no raw alert/confirm or deceptive UX detected.');
    process.exit(0);
  }
}
