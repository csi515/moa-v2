import test from 'node:test';
import assert from 'node:assert';
import {
  parseCsvLines,
  parseProductCsv,
  generateSampleProductCsv,
} from './productBulkImportEngine';

test('commerce.parseCsvLines: 쉼표, 따옴표, 줄바꿈 정상 파싱', () => {
  const csv = '이름,코드,가격\n"사과, 청송",APL-01,3000\n바나나,BAN-01,4500';
  const matrix = parseCsvLines(csv);
  assert.strictEqual(matrix.length, 3);
  assert.strictEqual(matrix[1][0], '사과, 청송');
  assert.strictEqual(matrix[2][0], '바나나');
});

test('commerce.parseProductCsv: 표준 한글 헤더 및 단품/옵션 상품 그룹화', () => {
  const sample = generateSampleProductCsv();
  const result = parseProductCsv(sample);

  assert.strictEqual(result.errorRows, 0);
  assert.strictEqual(result.validRows, 8);
  assert.strictEqual(result.groups.length, 5); // 아메리카노, 카페라떼, 제주말차라떼, 오가닉코튼티셔츠(4옵션), 도자기머그컵

  const tshirt = result.groups.find((g) => g.name.includes('티셔츠'));
  assert.ok(tshirt);
  assert.strictEqual(tshirt.variants.length, 4);
  assert.strictEqual(tshirt.variants[0].name, '화이트-M');
  assert.strictEqual(tshirt.variants[0].initialStock, 20);
});

test('commerce.parseProductCsv: 필수값 누락 및 오류 검출', () => {
  const invalidCsv = '상품명,판매가\n,1000\n콜라,천원';
  const result = parseProductCsv(invalidCsv);

  assert.strictEqual(result.validRows, 0);
  assert.strictEqual(result.errorRows, 2);
  assert.strictEqual(result.parsedRows[0].errors[0], '상품명이 누락되었습니다.');
  assert.strictEqual(result.parsedRows[1].errors[0], '판매가격이 올바르지 않습니다.');
});
