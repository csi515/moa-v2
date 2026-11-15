import assert from 'node:assert/strict';
import {
  getBusinessStartOfDay,
  getBusinessEndOfDay,
  isSameBusinessDay,
  calculateRemainingDays,
  formatBusinessYmd,
  toBusinessDateString,
  getBusinessToday,
  getBusinessYearMonth,
} from './businessDate';

const SEOUL_TZ = 'Asia/Seoul';

// 1. KST(Asia/Seoul) 기준 일자 집계 및 자정 경계선(Start/EndOfDay) ISO 검증
{
  const targetDate = '2026-10-25';
  const startIso = getBusinessStartOfDay(targetDate, SEOUL_TZ);
  const endIso = getBusinessEndOfDay(targetDate, SEOUL_TZ);

  // KST 2026-10-25 00:00:00.000 = UTC 2026-10-24 15:00:00.000Z
  assert.equal(startIso, '2026-10-24T15:00:00.000Z');
  // KST 2026-10-25 23:59:59.999 = UTC 2026-10-25 14:59:59.999Z
  assert.equal(endIso, '2026-10-25T14:59:59.999Z');

  // Date 객체 주입 시에도 동일한 당일 범위 도출 검증
  const midDayKst = new Date('2026-10-25T03:30:00.000Z'); // KST 12:30
  assert.equal(getBusinessStartOfDay(midDayKst, SEOUL_TZ), '2026-10-24T15:00:00.000Z');
  assert.equal(getBusinessEndOfDay(midDayKst, SEOUL_TZ), '2026-10-25T14:59:59.999Z');
}

// 2. KST 기준 23시 59분 결제 건과 익일 00시 01분 결제 건의 날짜 분리 검증
{
  // KST 2026-10-25 23:59:59 = UTC 2026-10-25 14:59:59Z
  const paymentNight = '2026-10-25T14:59:59.000Z';
  // KST 2026-10-26 00:01:00 = UTC 2026-10-25 15:01:00Z
  const paymentNextMorning = '2026-10-25T15:01:00.000Z';

  assert.equal(formatBusinessYmd(paymentNight, SEOUL_TZ), '2026-10-25');
  assert.equal(formatBusinessYmd(paymentNextMorning, SEOUL_TZ), '2026-10-26');

  // 동일 영업일 판정 검증: 두 건은 다른 영업일이어야 함
  assert.equal(isSameBusinessDay(paymentNight, paymentNextMorning, SEOUL_TZ), false);

  // KST 00:00:01과 KST 23:59:59는 같은 날이어야 함
  const morningKst = '2026-10-24T15:00:01.000Z'; // KST 2026-10-25 00:00:01
  assert.equal(isSameBusinessDay(morningKst, paymentNight, SEOUL_TZ), true);
}

// 3. 자정 마감 경계선 정밀도 검증 (23:59:59.999 vs 00:00:00.000)
{
  const endOfOct25 = '2026-10-25T14:59:59.999Z'; // KST 2026-10-25 23:59:59.999
  const startOfOct26 = '2026-10-25T15:00:00.000Z'; // KST 2026-10-26 00:00:00.000

  assert.equal(formatBusinessYmd(endOfOct25, SEOUL_TZ), '2026-10-25');
  assert.equal(formatBusinessYmd(startOfOct26, SEOUL_TZ), '2026-10-26');
  assert.equal(isSameBusinessDay(endOfOct25, startOfOct26, SEOUL_TZ), false);
}

// 4. 수강권/이용권 만료 D-Day 계산 검증 (calculateRemainingDays)
{
  const baseNow = '2026-10-25T05:00:00.000Z'; // KST 2026-10-25 14:00 (오늘)

  // 1) 당일 만료인 경우 (D-0)
  assert.equal(calculateRemainingDays('2026-10-25', baseNow, SEOUL_TZ), 0);
  // 당일 밤 23:59:59 시각에도 D-0 유지 확인
  const lateNightNow = '2026-10-25T14:59:00.000Z'; // KST 23:59
  assert.equal(calculateRemainingDays('2026-10-25', lateNightNow, SEOUL_TZ), 0);

  // 2) 내일 만료 (D-1)
  assert.equal(calculateRemainingDays('2026-10-26', baseNow, SEOUL_TZ), 1);

  // 3) 7일 후 만료 (D-7)
  assert.equal(calculateRemainingDays('2026-11-01', baseNow, SEOUL_TZ), 7);

  // 4) 어제 만료된 경우 (만료 1일 경과, -1)
  assert.equal(calculateRemainingDays('2026-10-24', baseNow, SEOUL_TZ), -1);

  // 5) 타임존이 다른 환경 (예: UTC)에서도 KST 기준 날짜로 일관되게 계산
  assert.equal(calculateRemainingDays('2026-10-25T15:30:00.000Z', baseNow, SEOUL_TZ), 1); // KST로는 10-26일이므로 1일 남음
}

// 5. 표준 날짜 문자열 정규화 (toBusinessDateString, getBusinessYearMonth, getBusinessToday)
{
  const kstNight = new Date('2026-10-25T14:59:59.000Z'); // KST 2026-10-25 23:59:59
  assert.equal(toBusinessDateString(kstNight, SEOUL_TZ), '2026-10-25');
  assert.equal(getBusinessYearMonth(kstNight, SEOUL_TZ), '2026-10');

  const kstNextDay = new Date('2026-10-25T15:00:01.000Z'); // KST 2026-10-26 00:00:01
  assert.equal(toBusinessDateString(kstNextDay, SEOUL_TZ), '2026-10-26');
  assert.equal(getBusinessYearMonth(kstNextDay, SEOUL_TZ), '2026-10');

  // getBusinessToday 형식 검증 (YYYY-MM-DD)
  const todayStr = getBusinessToday(SEOUL_TZ);
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/);
}

console.log('businessDate.test.ts: ok (all business day & timezone boundary tests passed)');
