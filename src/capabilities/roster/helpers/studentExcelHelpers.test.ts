import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseStudentCsvText } from './studentExcelHelpers';

describe('studentExcelHelpers CSV Parser', () => {
  it('correctly maps standard Korean headers and extracts valid rows', () => {
    const csv = `원생명,연락처,보호자이름,엄마번호,학교,학년,수강료
김민준,01012345678,이수진,01098765432,솔빛초,3학년,180000
박서아,,박진우,01055557777,한빛초,1학년,160000`;

    const { validRows, errorRows } = parseStudentCsvText(csv);

    assert.equal(errorRows.length, 0);
    assert.equal(validRows.length, 2);

    assert.equal(validRows[0].name, '김민준');
    assert.equal(validRows[0].phone, '010-1234-5678');
    assert.equal(validRows[0].guardianName, '이수진');
    assert.equal(validRows[0].guardianPhone, '010-9876-5432');
    assert.equal(validRows[0].school, '솔빛초');
    assert.equal(validRows[0].grade, '3학년');
    assert.equal(validRows[0].tuitionFee, 180000);

    assert.equal(validRows[1].name, '박서아');
    assert.equal(validRows[1].phone, undefined);
    assert.equal(validRows[1].guardianPhone, '010-5555-7777');
    assert.equal(validRows[1].tuitionFee, 160000);
  });

  it('reports errors for rows missing student name', () => {
    const csv = `원생명,연락처,보호자번호
김민준,010-1111-2222,010-3333-4444
,010-5555-6666,010-7777-8888`;

    const { validRows, errorRows } = parseStudentCsvText(csv);

    assert.equal(validRows.length, 1);
    assert.equal(validRows[0].name, '김민준');
    assert.equal(errorRows.length, 1);
    assert.equal(errorRows[0].rowNumber, 3);
    assert.match(errorRows[0].reason, /이름.*누락/);
  });
});
