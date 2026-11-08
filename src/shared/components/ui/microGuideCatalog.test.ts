import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMY_MICRO_GUIDES,
  getMicroGuide,
} from './microGuideCatalog';

describe('microGuideCatalog', () => {
  it('핵심 마이크로 가이드 10종이 정확히 등록되어 있어야 한다', () => {
    assert.ok(ACADEMY_MICRO_GUIDES.temporary_move);
    assert.ok(ACADEMY_MICRO_GUIDES.regular_move);
    assert.ok(ACADEMY_MICRO_GUIDES.session_pass);
    assert.ok(ACADEMY_MICRO_GUIDES.regular_tuition);
    assert.ok(ACADEMY_MICRO_GUIDES.payment_day);
    assert.ok(ACADEMY_MICRO_GUIDES.auto_invoice);
    assert.ok(ACADEMY_MICRO_GUIDES.cash_receipt);
    assert.ok(ACADEMY_MICRO_GUIDES.family_discount);
    assert.ok(ACADEMY_MICRO_GUIDES.student_level);
    assert.ok(ACADEMY_MICRO_GUIDES.assigned_teacher);
  });

  it('임시 이동 가이드에 보강 및 원상복구 안내가 명시되어 있어야 한다', () => {
    const guide = getMicroGuide('temporary_move');
    assert.ok(guide.description.includes('이번 주 하루만'));
    assert.ok(guide.description.includes('다음 주 정규 시간표는 원래대로'));
  });

  it('현금영수증 가이드에 기록용 안내가 명시되어 있어야 한다', () => {
    const guide = getMicroGuide('cash_receipt');
    assert.ok(guide.description.includes('직접 발행한 경우'));
  });

  it('첫 달 청구서 가이드에 즉시 생성 안내가 명시되어 있어야 한다', () => {
    const guide = getMicroGuide('auto_invoice');
    assert.ok(guide.description.includes('원생 등록 완료 즉시'));
  });
});
