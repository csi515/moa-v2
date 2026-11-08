import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIANO_QUICK_ACTIONS,
  resolveQuickActionBehavior,
} from './pianoQuickActionHelpers';

describe('pianoQuickActionHelpers', () => {
  it('4대 핵심 업무 액션이 정확하게 정의되어 있어야 한다', () => {
    assert.equal(PIANO_QUICK_ACTIONS.length, 4);
    const ids = PIANO_QUICK_ACTIONS.map((a) => a.id);
    assert.deepEqual(ids, ['new_student', 'check_in', 'pay_tuition', 'practice_room']);

    assert.equal(PIANO_QUICK_ACTIONS[0].title, '신규 원생 즉시 등록');
    assert.equal(PIANO_QUICK_ACTIONS[1].title, '지금 도착한 원생 출결 체크');
    assert.equal(PIANO_QUICK_ACTIONS[2].title, '수강료 즉시 수납');
    assert.equal(PIANO_QUICK_ACTIONS[3].title, '피아노 연습실 빈방 배정');
  });

  it('신규 원생 등록 클릭 시 폼 모달 오픈 플래그를 반환해야 한다', () => {
    const res = resolveQuickActionBehavior('new_student');
    assert.equal(res.openStudentForm, true);
    assert.equal(res.navTab, null);
  });

  it('출결, 수납, 연습실 클릭 시 해당 탭 이동 식별자를 반환해야 한다', () => {
    assert.deepEqual(resolveQuickActionBehavior('check_in'), {
      openStudentForm: false,
      navTab: 'attendance',
    });
    assert.deepEqual(resolveQuickActionBehavior('pay_tuition'), {
      openStudentForm: false,
      navTab: 'tuition',
    });
    assert.deepEqual(resolveQuickActionBehavior('practice_room'), {
      openStudentForm: false,
      navTab: 'practice',
    });
  });
});
