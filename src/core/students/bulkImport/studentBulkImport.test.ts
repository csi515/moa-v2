/**
 * 수강생 CSV/Excel 파서·검증 단위 테스트
 * 실행: npx tsx src/core/students/bulkImport/studentBulkImport.test.ts
 */
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  parseStudentImportCsv,
  parseStudentImportWorkbook,
} from './parseStudentImport';
import {
  validateStudentImportRows,
  buildTemplateCsv,
  normalizePhoneDigits,
  excelSerialToIsoDate,
  normalizeHeader,
} from './validateStudentImport';

function run(): void {
  assert.equal(normalizePhoneDigits('010-1234-5678'), '01012345678');
  assert.equal(normalizeHeader('학부모 연락처'), '보호자전화');
  assert.equal(normalizeHeader('수강과목'), '수강과목');
  assert.equal(normalizeHeader('course'), '수강과목');

  // Excel serial ~ 2015-03-12
  assert.equal(excelSerialToIsoDate(42075), '2015-03-12');

  const template = buildTemplateCsv();
  assert.ok(template.includes('이름'));
  assert.ok(template.includes('보호자전화'));
  assert.ok(template.includes('수강과목'));

  const csv = [
    '이름,성별,생년월일,연락처,학교,학년,보호자이름,보호자전화,보호자이메일,관계,수강과목,입학일,월수강료,납부일,메모',
    '김민수,남,2015-03-12,,서울초,초3,김부모,010-1234-5678,a@b.com,모,피아노 초급,2024-01-01,180000,10,',
    ',남,,,,,,01099998888,,,,,,',
    '이서연,여,2016-01-01,,부산초,초2,이부모,01087654321,,부,바이올린,2024-02-01,200000,15,',
  ].join('\n');

  const rows = parseStudentImportCsv(csv);
  assert.equal(rows.length, 3);

  const result = validateStudentImportRows(rows, new Set());
  assert.equal(result.validRows.length, 2);
  assert.ok(result.errors.some((e) => e.rowNumber === 3));
  assert.equal(result.validRows[0].guardianPhone, '01012345678');
  assert.equal(result.validRows[0].relationship, 'mother');
  assert.equal(result.validRows[0].courseSubject, '피아노 초급');

  const adultCsv = ['이름,보호자이름,보호자전화', '박성인,,'].join('\n');
  const adultRows = parseStudentImportCsv(adultCsv);
  const adultResult = validateStudentImportRows(adultRows, new Set());
  assert.equal(adultResult.validRows.length, 1);
  assert.equal(adultResult.validRows[0].isAdultSelf, true);

  // SheetJS workbook round-trip
  const aoa = [
    ['이름', '생년월일', '학부모연락처', '보호자이름', '수강과목'],
    ['최영희', 42075, '01011112222', '최부모', '피아노'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayLike<number>);
  const xlsxRows = parseStudentImportWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(xlsxRows.length, 1);
  const xlsxResult = validateStudentImportRows(xlsxRows, new Set());
  assert.equal(xlsxResult.validRows.length, 1);
  assert.equal(xlsxResult.validRows[0].name, '최영희');
  assert.equal(xlsxResult.validRows[0].birthDate, '2015-03-12');
  assert.equal(xlsxResult.validRows[0].guardianPhone, '01011112222');
  assert.equal(xlsxResult.validRows[0].courseSubject, '피아노');

  console.log('studentBulkImport.test.ts: all assertions passed');
}

run();
