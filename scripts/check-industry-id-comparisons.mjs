/**
 * src/core/**·src/capabilities/** (테스트 제외)에 업종 id 문자열 비교가 새로 늘지 않게 막는다.
 * 업종별 분기는 플러그인 플래그(getPluginFlag)나 매니페스트 설정으로 표현해야 한다.
 *
 * 기준선(BASELINE)은 파일별 현재 비교 개수다. 줄이면 기준선도 낮춰 주세요(더 적으면 경고만).
 * 실행: node scripts/check-industry-id-comparisons.mjs [--self-test]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['src/core', 'src/capabilities'];
const IDS = ['piano', 'pilates', 'gym', 'daycare', 'skin_clinic', 'retail', 'bath', 'academy', 'preschool', 'taekwondo'];
const ID_ALT = IDS.join('|');
const PATTERNS = [
  new RegExp(`[!=]==\\s*'(?:${ID_ALT})'`, 'g'),
  new RegExp(`'(?:${ID_ALT})'\\s*[!=]==`, 'g'),
  new RegExp(`\\bcase\\s+'(?:${ID_ALT})'\\s*:`, 'g'),
];

/** 정당한 사용(정의·카탈로그·별칭 표·신규 조직 기본값 등) 포함, 현재 개수 기준선. */
export const BASELINE = {
  'src/capabilities/attendance/attendanceIndustryCopy.ts': 1, // attendanceCopy.parentEmpty 변형값 'academy' (업종 아님)
  'src/capabilities/billing/finance/billingIncomeLink.ts': 1, // sourceType 'retail' (업종 아님)
  'src/capabilities/billing/finance/components/IncomeManagementView.tsx': 2, // sourceType 'retail' (업종 아님)
  'src/core/industry/genericPlugin.ts': 2, // 카탈로그 정의 → generic 매니페스트 생성(정의 측 값)
  'src/core/industry/industryUi.ts': 5, // isPianoIndustry 등 업종 판별 헬퍼 정의
};

/**
 * 전체 상한. 개수는 줄(line)이 아니라 비교 연산 '발생 수'로 센다
 * (한 줄에 비교가 둘이면 2개 — 예전 35(줄 수) vs 36(발생 수) 차이의 원인).
 */
export const TOTAL_CAP = 11;

function isTestFile(rel) {
  return /\.test\.[cm]?[jt]sx?$/.test(rel) || rel.split('/').includes('__tests__') || rel.split('/').includes('__fixtures__');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

export function countComparisons(source) {
  let count = 0;
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
    for (const re of PATTERNS) count += (line.match(re) || []).length;
  }
  return count;
}

export function collectViolations(counts, baseline = BASELINE) {
  const errors = [];
  for (const [file, n] of Object.entries(counts)) {
    const allowed = baseline[file] ?? 0;
    if (n > allowed) errors.push(`${file}: 업종 id 비교 ${n}개 (기준선 ${allowed}). 플러그인 플래그/훅으로 옮겨 주세요.`);
  }
  return errors;
}

function selfTest() {
  const probe = "if (x === 'gym') {}\n// y === 'piano'\nswitch (a) { case 'daycare': }\nif ('retail' !== z) {}";
  if (countComparisons(probe) !== 3) throw new Error('self-test: count mismatch');
  if (collectViolations({ 'src/core/new.ts': 1 }).length !== 1) throw new Error('self-test: new file not caught');
  if (collectViolations({ 'src/core/industry/genericPlugin.ts': 1 }).length !== 0) throw new Error('self-test: under baseline flagged');
  if (collectViolations({ 'src/capabilities/parent/ParentIndustryAdapter.ts': 1 }).length !== 1) throw new Error('self-test: migrated file not caught');
  if (countComparisons("if (a === 'piano' || a === 'academy') {}") !== 2) throw new Error('self-test: per-occurrence count');
  console.log('check-industry-id-comparisons: self-test ok');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).join('/'));
if (isMain) {
  if (process.argv.includes('--self-test')) selfTest();
  const counts = {};
  for (const root of ROOTS) {
    for (const full of walk(root)) {
      const rel = relative(process.cwd(), full).split(sep).join('/');
      if (isTestFile(rel)) continue;
      const n = countComparisons(readFileSync(full, 'utf8'));
      if (n > 0) counts[rel] = n;
    }
  }
  const errors = collectViolations(counts);
  for (const [file, allowed] of Object.entries(BASELINE)) {
    const n = counts[file] ?? 0;
    if (n < allowed) console.warn(`check-industry-id-comparisons: ${file} ${n} < 기준선 ${allowed} — 기준선을 낮춰 주세요.`);
  }
  if (errors.length) {
    console.error('check-industry-id-comparisons failed:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > TOTAL_CAP) {
    console.error(`check-industry-id-comparisons failed: 전체 ${total}개 > 상한 ${TOTAL_CAP}`);
    process.exit(1);
  }
  console.log(`check-industry-id-comparisons: ok (${total}개, 기준선 이내)`);
}
