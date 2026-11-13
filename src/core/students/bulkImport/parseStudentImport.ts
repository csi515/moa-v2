import type { StudentImportRawRow } from './types';
import { STUDENT_IMPORT_TEMPLATE_HEADERS } from './types';
import { excelSerialToIsoDate, normalizeHeader } from './validateStudentImport';
import { parseCsvToMatrix, parseXlsxToMatrix, createXlsxBlob } from '@/shared/utils/excelAdapter';

function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // 생년월일 등 Excel 시리얼(대략 20000~60000)
    if (value > 20000 && value < 80000 && Number.isInteger(value)) {
      return excelSerialToIsoDate(value);
    }
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).trim();
}

function rowsFromMatrix(matrix: unknown[][]): StudentImportRawRow[] {
  if (matrix.length === 0) return [];
  const headers = (matrix[0] || []).map((h) => normalizeHeader(cellToString(h)));
  const rows: StudentImportRawRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r] || [];
    if (!cells.length || cells.every((c) => !cellToString(c))) continue;
    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      values[h] = cellToString(cells[i]);
    });
    rows.push({ rowNumber: r + 1, values });
  }
  return rows;
}

/** CSV 텍스트 파싱 (PapaParse 기반 RFC 4180 완벽 준수) */
export function parseStudentImportCsv(text: string): StudentImportRawRow[] {
  const matrix = parseCsvToMatrix(text);
  return rowsFromMatrix(matrix);
}

/** 엑셀 ArrayBuffer / Blob 파싱 (read-excel-file 기반) */
export async function parseStudentImportWorkbook(buffer: ArrayBuffer | Blob | Uint8Array): Promise<StudentImportRawRow[]> {
  const matrix = await parseXlsxToMatrix(buffer);
  return rowsFromMatrix(matrix);
}

/** write-excel-file 기반 마이그레이션용 xlsx 템플릿 Blob 생성 */
export async function buildTemplateWorkbookBlob(): Promise<Blob> {
  const sample = [
    '김민수',
    '남',
    '2015-03-12',
    '',
    '서울초',
    '초3',
    '김부모',
    '01012345678',
    'parent@example.com',
    '모',
    '피아노 초급',
    new Date().toISOString().slice(0, 10),
    180000,
    10,
    '',
  ];
  return await createXlsxBlob(
    STUDENT_IMPORT_TEMPLATE_HEADERS as unknown as string[],
    [sample]
  );
}

/** 레거시 호환용 ArrayBuffer 반환 함수 */
export async function buildTemplateWorkbookBuffer(): Promise<ArrayBuffer> {
  const blob = await buildTemplateWorkbookBlob();
  return await blob.arrayBuffer();
}

export async function parseStudentImportFile(file: File): Promise<StudentImportRawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseStudentImportCsv(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    return await parseStudentImportWorkbook(buffer);
  }
  throw new Error('CSV(.csv) 또는 Excel(.xlsx, .xls) 파일만 지원합니다.');
}
