import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseCsvLines,
  parseProductCsv,
  generateSampleProductCsv,
} from './productBulkImportEngine';

test('parseCsvLines: 쉼표, 따옴표, 줄바꿈 정상 파싱', () => {
  const csv = `"아메리카노, ICE",8801,3500\n"카페라떼",8802,4000\r\n"바닐라 ""스페셜"" 라떼",8803,5000`;
  const lines = parseCsvLines(csv);
  assert.equal(lines.length, 3);
  assert.equal(lines[0][0], '아메리카노, ICE');
  assert.equal(lines[0][1], '8801');
  assert.equal(lines[0][2], '3500');
  assert.equal(lines[2][0], '바닐라 "스페셜" 라떼');
});

test('parseProductCsv: 표준 한글 헤더 및 단품/옵션 상품 그룹화', () => {
  const sample = generateSampleProductCsv();
  const res = parseProductCsv(sample);

  assert.equal(res.totalRows, 8);
  assert.equal(res.validRows, 8);
  assert.equal(res.errorRows, 0);

  // 아메리카노, 카페라떼, 말차라떼, 티셔츠(옵션4개), 머그컵 -> 총 5개 상품 그룹
  assert.equal(res.groups.length, 5);

  const tshirt = res.groups.find((g) => g.name === '오가닉 코튼 티셔츠');
  assert.ok(tshirt);
  assert.equal(tshirt.productCode, 'TSHIRT-001');
  assert.equal(tshirt.variants.length, 4);
  assert.equal(tshirt.variants[0].name, '화이트-M');
  assert.equal(tshirt.variants[0].sku, 'TS-W-M');
  assert.equal(tshirt.variants[0].initialStock, 20);
});

test('parseProductCsv: 필수값 누락 및 오류 검출', () => {
  const csv = `상품명,판매가,초기재고\n,3500,10\n콜드브루,-500,5\n콜드브루라떼,abc,10\n정상상품,5000,20`;
  const res = parseProductCsv(csv);

  assert.equal(res.totalRows, 4);
  assert.equal(res.validRows, 1);
  assert.equal(res.errorRows, 3);

  assert.equal(res.parsedRows[0].isValid, false);
  assert.ok(res.parsedRows[0].errors.some((e) => e.includes('상품명')));

  assert.equal(res.parsedRows[1].isValid, false);
  assert.ok(res.parsedRows[1].errors.some((e) => e.includes('0원 이상')));

  assert.equal(res.parsedRows[2].isValid, false);
  assert.ok(res.parsedRows[2].errors.some((e) => e.includes('올바르지 않습니다')));

  assert.equal(res.parsedRows[3].isValid, true);
  assert.equal(res.parsedRows[3].name, '정상상품');
});
