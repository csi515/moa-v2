import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseExpiryDate,
  resolveEffectivePassStatus,
  matchesPassesFilter,
  filterPasses,
  type PassesFilterCriteria,
} from './passesFilterPredicate';
import type { PassRecord } from '../services/passesService';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

console.log('[TEST] passesFilterPredicate test suite starting...');

// ─────────────────────────────────────────────────────────────────────────────
// 1. 소스 코드 정적 분석 검사 (가드레일: as any, : any 금지)
// ─────────────────────────────────────────────────────────────────────────────
{
  const targetPath = resolve(currentDir, 'passesFilterPredicate.ts');
  const fileContent = readFileSync(targetPath, 'utf-8');

  const hasAsAny = /\bas\s+any\b/.test(fileContent);
  const hasTypeAny = /:\s*any\b/.test(fileContent);

  assert.equal(hasAsAny, false, 'passesFilterPredicate.ts 파일에 "as any"가 없어야 합니다.');
  assert.equal(hasTypeAny, false, 'passesFilterPredicate.ts 파일에 ": any"가 없어야 합니다.');
  console.log('✓ PASS: Strict typing invariant (no as any / : any)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mock Data 준비
// ─────────────────────────────────────────────────────────────────────────────
const samplePasses: PassRecord[] = [
  {
    id: 'pass-1',
    tenant_id: 'org-1',
    customer_id: 'cust-1',
    customer_name: '홍길동',
    customer_phone: '010-1234-5678',
    pass_name: '필라테스 10회권',
    pass_type: 'COUNT_BASED',
    total_count: 10,
    remaining_count: 5,
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-01-01',
    expires_at: '2026-12-31',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pass-2',
    tenant_id: 'org-1',
    customer_id: 'cust-2',
    customer_name: '김철수',
    customer_phone: '010-9876-5432',
    pass_name: '수영 20회권 (소진)',
    pass_type: 'COUNT_BASED',
    total_count: 20,
    remaining_count: 0,
    status: 'ACTIVE', // DB에는 ACTIVE지만 실제 잔여 0회로 EXHAUSTED 판정 대상
    is_active: true,
    start_date: '2026-01-01',
    expires_at: '2026-12-31',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pass-3',
    tenant_id: 'org-1',
    customer_id: 'cust-3',
    customer_name: '이영희',
    customer_phone: '010-5555-4444',
    pass_name: '1개월 무제한 자유이용권',
    pass_type: 'PERIOD_BASED',
    total_count: 999,
    remaining_count: 0, // 기간제이므로 0이어도 만료 전이면 ACTIVE
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-10-01',
    expires_at: '2026-10-31',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'pass-4',
    tenant_id: 'org-1',
    customer_id: 'cust-4',
    customer_name: '박민수',
    customer_phone: '010-2222-3333',
    pass_name: '골프 10회권 (만료)',
    pass_type: 'COUNT_BASED',
    total_count: 10,
    remaining_count: 7, // 잔여 횟수가 남아있지만 날짜가 지남
    status: 'ACTIVE',
    is_active: true,
    start_date: '2026-01-01',
    expires_at: '2026-06-30',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pass-5',
    tenant_id: 'org-1',
    customer_id: 'cust-5',
    customer_name: '최지우',
    customer_phone: '010-7777-8888',
    pass_name: '요가 30회권 (일시정지)',
    pass_type: 'COUNT_BASED',
    total_count: 30,
    remaining_count: 15,
    status: 'PAUSED',
    is_active: false,
    start_date: '2026-01-01',
    expires_at: '2026-12-31',
    created_at: '2026-01-01T00:00:00Z',
  },
];

const FIXED_NOW = new Date('2026-10-15T12:00:00.000Z');

// ─────────────────────────────────────────────────────────────────────────────
// 3. parseExpiryDate 및 경계값 테스트
// ─────────────────────────────────────────────────────────────────────────────
{
  const parsedDay = parseExpiryDate('2026-10-31');
  assert.equal(parsedDay.getFullYear(), 2026);
  assert.equal(parsedDay.getMonth(), 9); // 0-indexed: 9 is October
  assert.equal(parsedDay.getDate(), 31);
  assert.equal(parsedDay.getHours(), 23);
  assert.equal(parsedDay.getMinutes(), 59);
  assert.equal(parsedDay.getSeconds(), 59);
  console.log('✓ PASS: parseExpiryDate end-of-day parsing');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. resolveEffectivePassStatus 실무자 판정 검증
// ─────────────────────────────────────────────────────────────────────────────
{
  // PAUSED 우선순위
  assert.equal(
    resolveEffectivePassStatus(samplePasses[4], FIXED_NOW),
    'PAUSED',
    'PAUSED 상태는 항상 PAUSED로 판정되어야 합니다.'
  );

  // 날짜 만료 (EXPIRED) 우선순위 (잔여 횟수가 남아도 날짜 초과 시 EXPIRED)
  assert.equal(
    resolveEffectivePassStatus(samplePasses[3], FIXED_NOW),
    'EXPIRED',
    '유효기간이 지난 이용권은 잔여 횟수가 남아있어도 EXPIRED여야 합니다.'
  );

  // 만료일 당일 23:59:59 직전 vs 다음날 00:00:01
  const expiryItem = {
    status: 'ACTIVE' as const,
    expires_at: '2026-10-15',
    remaining_count: 5,
    pass_type: 'COUNT_BASED' as const,
  };
  const justBeforeMidnight = new Date('2026-10-15T23:59:59.000');
  const nextDayMidnight = new Date('2026-10-16T00:00:01.000');
  assert.equal(resolveEffectivePassStatus(expiryItem, justBeforeMidnight), 'ACTIVE');
  assert.equal(resolveEffectivePassStatus(expiryItem, nextDayMidnight), 'EXPIRED');

  // 잔여 소진 (EXHAUSTED) 판정 (DB가 ACTIVE여도 횟수제 0회면 소진됨)
  assert.equal(
    resolveEffectivePassStatus(samplePasses[1], FIXED_NOW),
    'EXHAUSTED',
    '횟수제 이용권의 잔여 0회는 EXHAUSTED로 판정되어야 합니다.'
  );

  // 기간제 무제한 이용권은 remaining_count가 0이어도 ACTIVE
  assert.equal(
    resolveEffectivePassStatus(samplePasses[2], FIXED_NOW),
    'ACTIVE',
    '기간제(PERIOD_BASED) 이용권은 잔여가 0이어도 만료 전이면 ACTIVE여야 합니다.'
  );

  console.log('✓ PASS: resolveEffectivePassStatus edge case checks');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. matchesPassesFilter 상태 필터링 검증
// ─────────────────────────────────────────────────────────────────────────────
{
  // ALL 필터
  const allResult = filterPasses(samplePasses, { status: 'ALL' }, FIXED_NOW);
  assert.equal(allResult.length, 5, 'ALL 필터는 전체 5건을 반환해야 합니다.');

  // ACTIVE 필터 (pass-1, pass-3)
  const activeResult = filterPasses(samplePasses, { status: 'ACTIVE' }, FIXED_NOW);
  assert.deepEqual(
    activeResult.map((p) => p.id),
    ['pass-1', 'pass-3'],
    'ACTIVE 필터는 실제 유효한 이용권만 반환해야 합니다.'
  );

  // EXHAUSTED 필터 (pass-2)
  const exhaustedResult = filterPasses(samplePasses, { status: 'EXHAUSTED' }, FIXED_NOW);
  assert.deepEqual(
    exhaustedResult.map((p) => p.id),
    ['pass-2'],
    'EXHAUSTED 필터는 소진된 이용권만 반환해야 합니다.'
  );

  // EXPIRED 필터 (pass-4)
  const expiredResult = filterPasses(samplePasses, { status: 'EXPIRED' }, FIXED_NOW);
  assert.deepEqual(
    expiredResult.map((p) => p.id),
    ['pass-4'],
    'EXPIRED 필터는 만료된 이용권만 반환해야 합니다.'
  );

  // PAUSED 필터 (pass-5)
  const pausedResult = filterPasses(samplePasses, { status: 'PAUSED' }, FIXED_NOW);
  assert.deepEqual(
    pausedResult.map((p) => p.id),
    ['pass-5'],
    'PAUSED 필터는 일시정지된 이용권만 반환해야 합니다.'
  );

  console.log('✓ PASS: matchesPassesFilter status filtering');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 검색어 필터링 검증 (이름, 이용권명, 전화번호 4자리 및 하이픈)
// ─────────────────────────────────────────────────────────────────────────────
{
  // 이름 검색
  const nameResult = filterPasses(samplePasses, { searchQuery: '홍길동' }, FIXED_NOW);
  assert.equal(nameResult.length, 1);
  assert.equal(nameResult[0].id, 'pass-1');

  // 대소문자/트림 검색
  const passNameResult = filterPasses(samplePasses, { searchQuery: '  무제한  ' }, FIXED_NOW);
  assert.equal(passNameResult.length, 1);
  assert.equal(passNameResult[0].id, 'pass-3');

  // 전화번호 뒷 4자리 검색
  const phone4Result = filterPasses(samplePasses, { searchQuery: '5678' }, FIXED_NOW);
  assert.equal(phone4Result.length, 1);
  assert.equal(phone4Result[0].id, 'pass-1');

  // 하이픈 없는 전화번호 검색 (01098765432)
  const phoneFullResult = filterPasses(samplePasses, { searchQuery: '01098765432' }, FIXED_NOW);
  assert.equal(phoneFullResult.length, 1);
  assert.equal(phoneFullResult[0].id, 'pass-2');

  console.log('✓ PASS: Search query match (name, pass_name, phone 4-digits & raw)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 복합 조건 필터링 검증 (상태 + 검색어 + passType)
// ─────────────────────────────────────────────────────────────────────────────
{
  const complexResult = filterPasses(
    samplePasses,
    {
      status: 'ACTIVE',
      passType: 'COUNT_BASED',
      searchQuery: '필라테스',
    },
    FIXED_NOW
  );
  assert.equal(complexResult.length, 1);
  assert.equal(complexResult[0].id, 'pass-1');

  const noMatchResult = filterPasses(
    samplePasses,
    {
      status: 'EXPIRED',
      searchQuery: '홍길동',
    },
    FIXED_NOW
  );
  assert.equal(noMatchResult.length, 0, '조건이 불일치하면 0건을 반환해야 합니다.');

  console.log('✓ PASS: Complex multi-criteria filtering');
}

console.log('[SUCCESS] All 7 test suites in passesFilterPredicate.test.ts PASSED without errors!');
