/**
 * 상품 엑셀/CSV 대량 일괄 등록 & 유효성 검증 순수 엔진 (Pure Domain)
 */

export interface ParsedCsvRow {
  rowNumber: number;
  name: string;
  productCode: string | null;
  price: number;
  cost: number | null;
  category: string | null;
  variantName: string | null;
  sku: string | null;
  variantPrice: number | null;
  initialStock: number;
  isValid: boolean;
  errors: string[];
}

export interface ValidatedVariant {
  name: string;
  sku: string | null;
  price: number | null;
  cost: number | null;
  initialStock: number;
}

export interface ValidatedProductGroup {
  groupKey: string;
  name: string;
  productCode: string | null;
  price: number;
  cost: number | null;
  categoryName: string | null;
  initialStock: number; // 단품일 때의 초기재고
  variants: ValidatedVariant[];
  sourceRowNumbers: number[];
}

export interface CsvParseSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  groups: ValidatedProductGroup[];
  parsedRows: ParsedCsvRow[];
}

/** RFC 4180 준수 CSV 행 분리 파서 */
export function parseCsvLines(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, ''); // UTF-8 BOM 제거
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // 이스케이프된 따옴표 건너뛰기
        } else {
          insideQuote = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // 빈 행 제거
  return rows.filter((r) => r.length > 0 && r.some((c) => c.length > 0));
}

/** 헤더 인덱스 매핑 */
interface HeaderMap {
  nameIdx: number;
  codeIdx: number;
  priceIdx: number;
  costIdx: number;
  categoryIdx: number;
  variantNameIdx: number;
  skuIdx: number;
  variantPriceIdx: number;
  stockIdx: number;
}

function resolveHeaders(headers: string[]): HeaderMap {
  const norm = headers.map((h) => h.trim().toLowerCase().replace(/[\s_\-#]/g, ''));

  const findIdx = (keywords: string[]) => {
    return norm.findIndex((h) => keywords.some((k) => h === k || h.includes(k)));
  };

  return {
    nameIdx: findIdx(['상품명', '품명', 'name', 'productname', 'title']),
    codeIdx: findIdx(['바코드', '상품코드', 'code', 'productcode', 'barcode']),
    priceIdx: findIdx(['판매가', '가격', 'price', 'unitprice', 'retailprice']),
    costIdx: findIdx(['원가', '공급가', '매입가', 'cost', 'supplyprice']),
    categoryIdx: findIdx(['카테고리', '분류', 'category', 'categoryname']),
    variantNameIdx: findIdx(['옵션명', '옵션', 'variant', 'variantname', 'option']),
    skuIdx: findIdx(['옵션sku', 'sku', '옵션코드', 'variantsku']),
    variantPriceIdx: findIdx(['옵션가격', '옵션추가금액', 'variantprice']),
    stockIdx: findIdx(['초기재고', '기초재고', '재고', '수량', 'stock', 'initialstock', 'qty', 'quantity']),
  };
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** CSV 텍스트를 파싱하고 유효성 검사 및 그룹화를 수행 */
export function parseProductCsv(csvContent: string): CsvParseSummary {
  const rows = parseCsvLines(csvContent);
  if (rows.length < 2) {
    return {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      groups: [],
      parsedRows: [],
    };
  }

  const headerRow = rows[0];
  const hMap = resolveHeaders(headerRow);
  const dataRows = rows.slice(1);

  const parsedRows: ParsedCsvRow[] = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const cols = dataRows[idx];
    const rowNum = idx + 2; // 엑셀 행번호 (1-based, 헤더 다음)

    const rawName = hMap.nameIdx >= 0 ? cols[hMap.nameIdx] : '';
    const rawCode = hMap.codeIdx >= 0 ? cols[hMap.codeIdx] : '';
    const rawPrice = hMap.priceIdx >= 0 ? cols[hMap.priceIdx] : '';
    const rawCost = hMap.costIdx >= 0 ? cols[hMap.costIdx] : '';
    const rawCat = hMap.categoryIdx >= 0 ? cols[hMap.categoryIdx] : '';
    const rawVariant = hMap.variantNameIdx >= 0 ? cols[hMap.variantNameIdx] : '';
    const rawSku = hMap.skuIdx >= 0 ? cols[hMap.skuIdx] : '';
    const rawVarPrice = hMap.variantPriceIdx >= 0 ? cols[hMap.variantPriceIdx] : '';
    const rawStock = hMap.stockIdx >= 0 ? cols[hMap.stockIdx] : '';

    const errors: string[] = [];
    const name = rawName.trim();
    if (!name) {
      errors.push('상품명이 누락되었습니다.');
    }

    const price = parseNumber(rawPrice);
    if (price === null) {
      errors.push('판매가격이 올바르지 않습니다.');
    } else if (price < 0) {
      errors.push('판매가격은 0원 이상이어야 합니다.');
    }

    const cost = parseNumber(rawCost);
    if (cost !== null && cost < 0) {
      errors.push('원가는 0원 이상이어야 합니다.');
    }

    const initialStock = Math.max(0, Math.floor(parseNumber(rawStock) || 0));
    const variantPrice = parseNumber(rawVarPrice);

    parsedRows.push({
      rowNumber: rowNum,
      name,
      productCode: rawCode.trim() || null,
      price: price ?? 0,
      cost: cost,
      category: rawCat.trim() || null,
      variantName: rawVariant.trim() || null,
      sku: rawSku.trim() || null,
      variantPrice: variantPrice,
      initialStock,
      isValid: errors.length === 0,
      errors,
    });
  }

  // 유효한 행들만 그룹화
  const validRowsList = parsedRows.filter((r) => r.isValid);
  const groupsMap = new Map<string, ValidatedProductGroup>();

  for (const row of validRowsList) {
    // 상품명 + (바코드 또는 카테고리) 기준으로 묶음
    const key = `${row.name}:::${row.productCode || ''}:::${row.category || ''}`;
    let group = groupsMap.get(key);

    if (!group) {
      group = {
        groupKey: key,
        name: row.name,
        productCode: row.productCode,
        price: row.price,
        cost: row.cost,
        categoryName: row.category,
        initialStock: row.initialStock,
        variants: [],
        sourceRowNumbers: [row.rowNumber],
      };
      groupsMap.set(key, group);
    } else {
      group.sourceRowNumbers.push(row.rowNumber);
      // 단품 재고는 합산
      group.initialStock += row.initialStock;
    }

    if (row.variantName) {
      group.variants.push({
        name: row.variantName,
        sku: row.sku,
        price: row.variantPrice != null ? row.variantPrice : row.price,
        cost: row.cost,
        initialStock: row.initialStock,
      });
    }
  }

  return {
    totalRows: parsedRows.length,
    validRows: validRowsList.length,
    errorRows: parsedRows.length - validRowsList.length,
    groups: Array.from(groupsMap.values()),
    parsedRows,
  };
}

/** 엑셀에서 바로 열 수 있는 UTF-8 BOM 포함 샘플 CSV 생성 */
export function generateSampleProductCsv(): string {
  const headers = [
    '상품명',
    '바코드',
    '판매가',
    '원가',
    '카테고리',
    '옵션명',
    '옵션SKU',
    '옵션가격',
    '초기재고',
  ].join(',');

  const rows = [
    '아메리카노,88010001,3500,1200,음료,,,,100',
    '카페라떼,88010002,4000,1500,음료,,,,50',
    '제주 말차 라떼,88010003,5500,2100,음료,,,,30',
    '오가닉 코튼 티셔츠,TSHIRT-001,29000,11000,의류,화이트-M,TS-W-M,29000,20',
    '오가닉 코튼 티셔츠,TSHIRT-001,29000,11000,의류,화이트-L,TS-W-L,29000,25',
    '오가닉 코튼 티셔츠,TSHIRT-001,29000,11000,의류,블랙-M,TS-B-M,29000,15',
    '오가닉 코튼 티셔츠,TSHIRT-001,29000,11000,의류,블랙-L,TS-B-L,29000,30',
    '수제 도자기 머그컵,MUG-CUP-01,15000,6000,소품,,,,40',
  ];

  return '\uFEFF' + [headers, ...rows].join('\r\n');
}
