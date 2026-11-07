import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentClipboardText, inferColumnType } from './parseStudentClipboard';

describe('parseStudentClipboard', () => {
  it('전화번호, 생년월일, 성별, 이름 열 유형을 올바르게 추론해야 한다', () => {
    assert.equal(inferColumnType(['010-1234-5678', '010-9876-5432']), '보호자전화');
    assert.equal(inferColumnType(['2015-05-12', '2016-11-20']), '생년월일');
    assert.equal(inferColumnType(['남', '여', '남']), '성별');
    assert.equal(inferColumnType(['초3', '초5', '중1']), '학년');
    assert.equal(inferColumnType(['김민준', '이서아', '박도현']), '이름');
  });

  it('엑셀에서 탭 구분자로 복사된 헤더 포함 표를 올바르게 파싱해야 한다', () => {
    const clipboardText = `이름\t성별\t생년월일\t보호자명\t보호자전화\t수강과목
김민준\t남\t2015-03-12\t김철수\t010-1111-2222\t피아노 바이엘
김서아\t여\t2018-07-25\t김철수\t010-1111-2222\t유치부 피아노`;

    const rows = parseStudentClipboardText(clipboardText);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].values['이름'], '김민준');
    assert.equal(rows[0].values['성별'], '남');
    assert.equal(rows[0].values['생년월일'], '2015-03-12');
    assert.equal(rows[0].values['보호자전화'], '010-1111-2222');
    assert.equal(rows[0].values['수강과목'], '피아노 바이엘');

    assert.equal(rows[1].values['이름'], '김서아');
    assert.equal(rows[1].values['성별'], '여');
  });

  it('헤더가 없는 순수 데이터 복사본도 열 패턴 매칭으로 자동 인식해야 한다', () => {
    const clipboardText = `이도현\t남\t2014-09-01\t010-3333-4444\t초5
박하늘\t여\t2016-04-15\t010-5555-6666\t초3`;

    const rows = parseStudentClipboardText(clipboardText);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].values['이름'], '이도현');
    assert.equal(rows[0].values['성별'], '남');
    assert.equal(rows[0].values['생년월일'], '2014-09-01');
    assert.equal(rows[0].values['보호자전화'], '010-3333-4444');
    assert.equal(rows[0].values['학년'], '초5');
  });

  it('빈 문자열이나 공백만 있는 경우 빈 배열을 반환해야 한다', () => {
    assert.deepEqual(parseStudentClipboardText(''), []);
    assert.deepEqual(parseStudentClipboardText('   \n\n  '), []);
  });
});
