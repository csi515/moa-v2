import type { StudentImportRawRow } from './types';
import { STUDENT_IMPORT_TEMPLATE_HEADERS } from './types';
import { normalizeHeader } from './validateStudentImport';

/**
 * 특정 셀 텍스트의 데이터 유형을 패턴 매칭으로 판별
 */
export function inferColumnType(sampleValues: string[]): string | null {
  const nonEmpties = sampleValues.filter(v => v && v.trim().length > 0);
  if (nonEmpties.length === 0) return null;

  // 1. 전화번호 (010, 011, 02 등 또는 9~11자리 숫자)
  const phoneCount = nonEmpties.filter(v => {
    const clean = v.replace(/[^0-9]/g, '');
    return clean.startsWith('01') && (clean.length === 10 || clean.length === 11);
  }).length;
  if (phoneCount / nonEmpties.length >= 0.6) {
    return '보호자전화';
  }

  // 2. 생년월일 (2015-05-12, 150512, 2015.05.12 등)
  const dateCount = nonEmpties.filter(v => {
    const clean = v.trim();
    return (
      /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(clean) ||
      /^\d{2}[./-]\d{1,2}[./-]\d{1,2}$/.test(clean) ||
      (/^\d{6}$/.test(clean) && Number(clean.slice(2, 4)) <= 12) ||
      (/^\d{8}$/.test(clean) && Number(clean.slice(4, 6)) <= 12)
    );
  }).length;
  if (dateCount / nonEmpties.length >= 0.6) {
    return '생년월일';
  }

  // 3. 성별 (남, 여, 남성, 여성, M, F)
  const genderCount = nonEmpties.filter(v => /^(남|여|남성|여성|m|f)$/i.test(v.trim())).length;
  if (genderCount / nonEmpties.length >= 0.6) {
    return '성별';
  }

  // 4. 학년 (초3, 중1, 유치부, 3학년 등)
  const gradeCount = nonEmpties.filter(v => /^(초|중|고|\d+학년|유치)/.test(v.trim())).length;
  if (gradeCount / nonEmpties.length >= 0.6) {
    return '학년';
  }

  // 5. 이름 (2~4글자 한글)
  const nameCount = nonEmpties.filter(v => /^[가-힣]{2,4}$/.test(v.trim())).length;
  if (nameCount / nonEmpties.length >= 0.6) {
    return '이름';
  }

  return null;
}

/**
 * 엑셀 표 복사(Ctrl+C) 후 클립보드 텍스트(TSV / CSV)를 파싱하여 StudentImportRawRow 배열로 변환
 */
export function parseStudentClipboardText(text: string): StudentImportRawRow[] {
  if (!text || !text.trim()) return [];

  // BOM 제거 및 줄바꿈 정규화
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // 탭(\t) 구분자인지 쉼표(,) 구분자인지 감지
  const hasTabs = lines.some(l => l.includes('\t'));
  const splitLine = (line: string): string[] => {
    if (hasTabs) {
      return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    // 쉼표 분할 (따옴표 고려)
    return line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
  };

  const matrix = lines.map(splitLine);
  if (matrix.length === 0) return [];

  const firstRow = matrix[0];
  const normalizedFirstRow = firstRow.map(h => normalizeHeader(h));

  // 1. 첫 행이 알려진 템플릿 헤더인지 검사
  const matchedHeadersCount = normalizedFirstRow.filter(h =>
    (STUDENT_IMPORT_TEMPLATE_HEADERS as readonly string[]).includes(h)
  ).length;

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (matchedHeadersCount >= 1) {
    // 첫 행이 헤더인 경우
    headers = normalizedFirstRow;
    dataRows = matrix.slice(1);
  } else {
    // 첫 행이 헤더가 아닌 데이터인 경우 -> 열별 패턴 추론
    dataRows = matrix;
    const colCount = Math.max(...matrix.map(r => r.length));
    const inferredHeaders: string[] = [];
    const usedHeaders = new Set<string>();

    for (let c = 0; c < colCount; c++) {
      const colSamples = matrix.slice(0, 10).map(r => r[c] || '');
      let inferred = inferColumnType(colSamples);

      // 이미 '이름'이 배정되었는데 또 한글 2~4글자면 '보호자이름'으로 추론
      if (inferred === '이름' && usedHeaders.has('이름')) {
        inferred = '보호자이름';
      }
      // 이미 '보호자전화'가 배정되었는데 또 전화번호면 '연락처'로 추론
      if (inferred === '보호자전화' && usedHeaders.has('보호자전화')) {
        inferred = '연락처';
      }

      if (inferred && !usedHeaders.has(inferred)) {
        inferredHeaders.push(inferred);
        usedHeaders.add(inferred);
      } else {
        inferredHeaders.push(`열_${c + 1}`);
      }
    }
    headers = inferredHeaders;
  }

  // 원본 행 데이터 구성
  const rawRows: StudentImportRawRow[] = [];
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    if (!cells || cells.every(c => !c.trim())) continue;

    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h && cells[i] !== undefined) {
        values[h] = cells[i];
      }
    });

    // 최소 이름 또는 연락처가 존재하는 행만 포함
    if (values['이름'] || values['보호자전화'] || values['연락처']) {
      rawRows.push({
        rowNumber: r + (matchedHeadersCount >= 1 ? 2 : 1),
        values,
      });
    }
  }

  return rawRows;
}
