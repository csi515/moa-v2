import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSmartPhoneInput,
  TUITION_STEP_AMOUNTS,
  TUITION_DISCOUNT_PRESETS,
  TUITION_PRESET_AMOUNTS,
  applyTuitionStep,
  applyTuitionDiscount,
  PAYMENT_DAY_PRESETS,
} from './studentSmartInputHelpers';

describe('studentSmartInputHelpers', () => {
  it('010 전체 번호 입력 시 하이픈이 자동으로 삽입되어야 한다', () => {
    assert.equal(formatSmartPhoneInput('01012345678'), '010-1234-5678');
    assert.equal(formatSmartPhoneInput('010-1234-5678'), '010-1234-5678');
    assert.equal(formatSmartPhoneInput('01098765432'), '010-9876-5432');
  });

  it('8자리 뒷자리만 입력 시 010을 자동으로 붙여서 완성해야 한다', () => {
    assert.equal(formatSmartPhoneInput('12345678'), '010-1234-5678');
    assert.equal(formatSmartPhoneInput('98765432'), '010-9876-5432');
  });

  it('입력 도중의 번호도 올바르게 부분 포맷팅되어야 한다', () => {
    assert.equal(formatSmartPhoneInput('010'), '010');
    assert.equal(formatSmartPhoneInput('0101'), '010-1');
    assert.equal(formatSmartPhoneInput('0101234'), '010-1234');
    assert.equal(formatSmartPhoneInput('01012345'), '010-1234-5');
    assert.equal(formatSmartPhoneInput('01012345678'), '010-1234-5678');
  });

  it('서울 유선전화 02 번호도 정상 포맷팅되어야 한다', () => {
    assert.equal(formatSmartPhoneInput('0212345678'), '02-1234-5678');
    assert.equal(formatSmartPhoneInput('021234567'), '02-123-4567');
  });

  it('빈 문자열이나 공백 입력 시 빈 문자열을 반환해야 한다', () => {
    assert.equal(formatSmartPhoneInput(''), '');
    assert.equal(formatSmartPhoneInput('   '), '');
  });

  it('수강료 간편 증감 가산 버튼 상수가 +1만, +5만, +10만으로 구성되어야 한다', () => {
    assert.equal(TUITION_STEP_AMOUNTS.length, 3);
    assert.deepEqual(
      TUITION_STEP_AMOUNTS.map((s) => s.value),
      [10000, 50000, 100000]
    );
    assert.deepEqual(
      TUITION_STEP_AMOUNTS.map((s) => s.label),
      ['+1만', '+5만', '+10만']
    );
  });

  it('applyTuitionStep 함수가 기존 금액에 가산 금액을 올바르게 누적 계산해야 한다', () => {
    // 빈 값이나 0원에서 시작할 때
    assert.equal(applyTuitionStep(0, 10000), 10000);
    assert.equal(applyTuitionStep('', 50000), 50000);
    assert.equal(applyTuitionStep(undefined, 100000), 100000);

    // 기존 금액이 있는 경우 누적
    assert.equal(applyTuitionStep(150000, 10000), 160000);
    assert.equal(applyTuitionStep(150000, 50000), 200000);
    assert.equal(applyTuitionStep(200000, 100000), 300000);

    // 문자열 숫자 입력 처리
    assert.equal(applyTuitionStep('180000', 10000), 190000);

    // 음수 방지
    assert.equal(applyTuitionStep(5000, -10000), 0);
  });

  it('형제자매 할인 차감 프리셋 상수가 -1만, -2만, -3만으로 정의되어야 한다', () => {
    assert.equal(TUITION_DISCOUNT_PRESETS.length, 3);
    assert.deepEqual(
      TUITION_DISCOUNT_PRESETS.map((d) => d.value),
      [10000, 20000, 30000]
    );
    assert.deepEqual(
      TUITION_DISCOUNT_PRESETS.map((d) => d.label),
      ['-1만', '-2만', '-3만']
    );
  });

  it('applyTuitionDiscount 함수가 할인액을 차감하고 최소 0원을 보장해야 한다', () => {
    assert.equal(applyTuitionDiscount(180000, 10000), 170000);
    assert.equal(applyTuitionDiscount(200000, 20000), 180000);
    assert.equal(applyTuitionDiscount(150000, 30000), 120000);
    assert.equal(applyTuitionDiscount('180000', 10000), 170000);

    // 초과 차감 시 0원 보장
    assert.equal(applyTuitionDiscount(15000, 20000), 0);
    assert.equal(applyTuitionDiscount(0, 10000), 0);
    assert.equal(applyTuitionDiscount('', 10000), 0);
  });

  it('결제일 프리셋 상수가 올바르게 정의되어 있어야 한다', () => {
    assert.equal(TUITION_PRESET_AMOUNTS.length, 5);
    assert.deepEqual(PAYMENT_DAY_PRESETS, [1, 5, 10, 15, 25]);
  });
});
