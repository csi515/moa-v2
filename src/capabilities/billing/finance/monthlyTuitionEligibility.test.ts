/**
 * 월회비 자동 생성 대상 판정
 * 실행: npm run test:monthly-tuition-eligibility
 */
import assert from 'node:assert/strict';
import type { Student } from '@/types';
import {
  filterMonthlyTuitionAutoGenerateStudents,
  isMonthlyTuitionAutoGenerateEligible,
} from './monthlyTuitionEligibility';

const asOf = '2026-09';

function student(
  partial: Pick<Student, 'id'> &
    Partial<Pick<Student, 'billingMode' | 'status' | 'joinDate' | 'name'>>
): Pick<Student, 'id' | 'name' | 'billingMode' | 'status' | 'joinDate'> {
  return {
    id: partial.id,
    name: partial.name ?? '원생',
    billingMode: partial.billingMode ?? 'monthly',
    status: partial.status ?? 'active',
    joinDate: partial.joinDate ?? '2026-01-01',
  };
}

function eligible(
  row: ReturnType<typeof student>,
  yearMonth: string
): boolean {
  return isMonthlyTuitionAutoGenerateEligible(row, yearMonth, asOf);
}

function run() {
  const current = student({ id: 'a', status: 'active', billingMode: 'monthly' });

  // 현재 월 + 현재 active + 과거부터 재원으로 보이는 경우(joinDate만 근거)
  assert.equal(eligible(current, '2026-09'), true);

  // 현재 active여도 과거 월은 생성하지 않음 — 그달 재원 여부를 알 수 없음
  assert.equal(eligible(current, '2026-01'), false);

  // 현재 active + 과거 월에 퇴원했을 수 있음 — 이력 없음, 생성하지 않음
  assert.equal(eligible(current, '2026-03'), false);

  // 현재 active + 과거 월에 휴원했을 수 있음 — 이력 없음, 생성하지 않음
  assert.equal(eligible(current, '2026-02'), false);

  // joinDate 이전 월
  assert.equal(
    eligible(
      student({ id: 'f', status: 'active', billingMode: 'monthly', joinDate: '2026-10-01' }),
      '2026-09'
    ),
    false
  );

  // 입학월은 현재 월이면 포함
  assert.equal(
    eligible(
      student({ id: 'e', status: 'active', billingMode: 'monthly', joinDate: '2026-09-15' }),
      '2026-09'
    ),
    true
  );

  // 미래 월: 현재 재원 스냅샷을 그대로 사용 (미래 상태 이력도 없음)
  assert.equal(eligible(current, '2026-10'), true);

  // 미래 월이어도 입학 전이면 제외
  assert.equal(
    eligible(
      student({ id: 'later', status: 'active', billingMode: 'monthly', joinDate: '2026-11-01' }),
      '2026-10'
    ),
    false
  );

  // session_pass
  assert.equal(
    eligible(student({ id: 'b', status: 'active', billingMode: 'session_pass' }), '2026-09'),
    false
  );

  // 현재 퇴원·휴원은 현재 월도 제외
  assert.equal(
    eligible(student({ id: 'c', status: 'withdrawn', billingMode: 'monthly' }), '2026-09'),
    false
  );
  assert.equal(
    eligible(student({ id: 'd', status: 'leave', billingMode: 'monthly' }), '2026-09'),
    false
  );

  const roster = [
    student({ id: 'active-monthly', status: 'active', billingMode: 'monthly' }),
    student({ id: 'active-pass', status: 'active', billingMode: 'session_pass' }),
    student({ id: 'withdrawn-monthly', status: 'withdrawn', billingMode: 'monthly' }),
    student({ id: 'leave-monthly', status: 'leave', billingMode: 'monthly' }),
    student({ id: 'future-join', status: 'active', billingMode: 'monthly', joinDate: '2026-10-01' }),
  ];
  assert.deepEqual(
    filterMonthlyTuitionAutoGenerateStudents(roster, '2026-09', asOf).map((row) => row.id),
    ['active-monthly']
  );
  assert.deepEqual(
    filterMonthlyTuitionAutoGenerateStudents(roster, '2026-01', asOf).map((row) => row.id),
    []
  );

  console.log('monthlyTuitionEligibility.test.ts: ok');
}

run();
