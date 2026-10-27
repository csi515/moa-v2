import * as XLSX from 'xlsx';
import type { StudentImportRawRow } from './types';
import { STUDENT_IMPORT_TEMPLATE_HEADERS } from './types';
import { excelSerialToIsoDate, normalizeHeader } from './validateStudentImport';

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

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

export function parseStudentImportCsv(text: string): StudentImportRawRow[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  const matrix = lines.map(splitCsvLine);
  return rowsFromMatrix(matrix);
}

export function parseStudentImportWorkbook(buffer: ArrayBuffer): StudentImportRawRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][];
  return rowsFromMatrix(matrix);
}

/** SheetJS로 마이그레이션용 xlsx 템플릿 생성 */
export function buildTemplateWorkbookBuffer(): ArrayBuffer {
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
    '180000',
    '10',
    '',
  ];
  const aoa = [STUDENT_IMPORT_TEMPLATE_HEADERS as unknown as string[], sample];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, '수강생');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const bytes = out instanceof Uint8Array ? out : new Uint8Array(out as ArrayLike<number>);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function parseStudentImportFile(file: File): Promise<StudentImportRawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseStudentImportCsv(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    return parseStudentImportWorkbook(buffer);
  }
  throw new Error('CSV(.csv) 또는 Excel(.xlsx, .xls) 파일만 지원합니다.');
}
