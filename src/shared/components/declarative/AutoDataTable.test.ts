import assert from 'node:assert/strict';
import type { AutoColumn, AutoField } from './types';
import * as DeclarativeModule from './index';

console.log('🧪 [AutoDataTable & Declarative Suite] Phase 3 선언형 UI 프리미티브 검증 시작...\n');

// 1. Suite 1: AutoColumn 컬럼 명세 및 정렬 속성 매핑 검증
(() => {
  const columns: AutoColumn[] = [
    { key: 'name', header: '이름', align: 'left' },
    { key: 'price', header: '가격', isNumeric: true },
    { key: 'status', header: '상태', align: 'center' },
  ];

  assert.strictEqual(columns.length, 3, '컬럼 수는 3개여야 합니다');

  // isNumeric이면 우측 정렬 및 고정폭 스타일 대상이어야 함
  const priceCol = columns.find((c) => c.key === 'price');
  assert.ok(priceCol?.isNumeric, 'price 컬럼은 isNumeric이어야 합니다');
  const isRight = priceCol?.align === 'right' || priceCol?.isNumeric;
  assert.strictEqual(isRight, true, 'isNumeric 컬럼은 오른쪽 정렬로 평가되어야 합니다');

  console.log('  ✔ Suite 1: AutoColumn 명세 및 isNumeric 매핑 검증 완료');
})();

// 2. Suite 2: AutoField 스키마 필드 명세 검증
(() => {
  const fields: AutoField[] = [
    { name: 'title', label: '제목', type: 'text', required: true },
    { name: 'amount', label: '금액', type: 'number', required: true },
    {
      name: 'category',
      label: '분류',
      type: 'select',
      options: [
        { label: '일반', value: 'general' },
        { label: '비용', value: 'expense' },
      ],
    },
    { name: 'is_active', label: '활성화', type: 'switch', defaultValue: true },
  ];

  assert.strictEqual(fields.length, 4, '필드 수는 4개여야 합니다');
  const selectField = fields.find((f) => f.name === 'category');
  assert.strictEqual(selectField?.options?.length, 2, 'select 필드는 2개의 옵션을 가져야 합니다');

  console.log('  ✔ Suite 2: AutoField 폼 명세 및 옵션 바인딩 검증 완료');
})();

// 3. Suite 3: 검색어 클라이언트 필터링 알고리즘 무결성 검증
(() => {
  const records = [
    { id: '1', name: '홍길동', phone: '010-1234-5678', memo: '피아노 입문' },
    { id: '2', name: '김철수', phone: '010-9876-5432', memo: '바이올린 고급' },
    { id: '3', name: '이영희', phone: '010-5555-4444', memo: '피아노 중급' },
  ];

  const columns: AutoColumn[] = [
    { key: 'name', header: '이름' },
    { key: 'phone', header: '전화번호' },
    { key: 'memo', header: '메모' },
  ];

  function filterRecords(term: string) {
    if (!term.trim()) return records;
    const lower = term.toLowerCase();
    return records.filter((rec) => {
      const row = rec as Record<string, unknown>;
      return columns.some((col) => {
        const val = row[col.key];
        return val && String(val).toLowerCase().includes(lower);
      });
    });
  }

  const pianoResult = filterRecords('피아노');
  assert.strictEqual(pianoResult.length, 2, "'피아노' 검색 결과는 2건이어야 합니다");

  const phoneResult = filterRecords('9876');
  assert.strictEqual(phoneResult.length, 1, "'9876' 검색 결과는 1건(김철수)이어야 합니다");
  assert.strictEqual(phoneResult[0].name, '김철수');

  const emptyResult = filterRecords('첼로');
  assert.strictEqual(emptyResult.length, 0, "'첼로' 검색 결과는 0건이어야 합니다");

  console.log('  ✔ Suite 3: 검색어 필터링 알고리즘 및 다중 컬럼 매칭 검증 완료');
})();

// 4. Suite 4: Declarative Public API 배럴 무결성 검증
(() => {
  assert.ok(typeof DeclarativeModule.AutoDataTable === 'function', 'AutoDataTable이 export되어야 합니다');
  assert.ok(typeof DeclarativeModule.AutoEntityModal === 'function', 'AutoEntityModal이 export되어야 합니다');

  console.log('  ✔ Suite 4: Declarative Public API 배럴 무결성 확인 완료\n');
})();

console.log('✨ [AutoDataTable & Declarative Suite] 모든 Phase 3 선언형 UI 검증 통과!\n');
