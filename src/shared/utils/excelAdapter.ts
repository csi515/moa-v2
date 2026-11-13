/**
 * Moa-v2 Universal Excel & CSV Adapter
 * 
 * 취약점 내재된 대형 SheetJS(xlsx) 대신 가볍고 안전한
 * read-excel-file, write-excel-file, papaparse를 통합 추상화하는 포트-어댑터 레이어.
 */

import Papa from 'papaparse';
import readXlsxFileUniversal from 'read-excel-file/universal';
import writeXlsxFileUniversal from 'write-excel-file/universal';

export interface CsvParseResult<T = unknown> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * CSV 문자열을 파싱하여 2차원 배열로 변환 (PapaParse 기반, RFC 4180 완벽 준수)
 */
export function parseCsvToMatrix(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const parsed = Papa.parse<string[]>(clean, {
    skipEmptyLines: 'greedy',
  });
  return parsed.data;
}

/**
 * 엑셀 바이너리(Blob | ArrayBuffer | Buffer)를 파싱하여 2차원 배열로 변환
 */
export async function parseXlsxToMatrix(input: Blob | ArrayBuffer | Uint8Array): Promise<unknown[][]> {
  const blob = input instanceof Blob ? input : new Blob([input as any]);
  const rows = await readXlsxFileUniversal(blob);
  // 만약 다중 시트 객체 형태(SheetData[])로 반환되는 경우 처리
  if (rows && rows.length > 0 && typeof rows[0] === 'object' && 'data' in rows[0] && Array.isArray((rows[0] as any).data)) {
    return (rows[0] as any).data as unknown[][];
  }
  return rows as unknown as unknown[][];
}

/**
 * 2차원 데이터를 받아 .xlsx Blob을 생성 (write-excel-file 기반)
 */
export async function createXlsxBlob(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Promise<Blob> {
  const headerRow = headers.map((h) => ({
    value: h,
    fontWeight: 'bold' as const,
  }));

  const dataRows = rows.map((row) =>
    row.map((cell) => {
      if (cell == null || cell === '') {
        return { value: '' };
      }
      if (typeof cell === 'number') {
        return { value: cell, type: Number };
      }
      if (typeof cell === 'boolean') {
        return { value: cell ? 'Y' : 'N' };
      }
      return { value: String(cell) };
    })
  );

  const fileData = [headerRow, ...dataRows];
  return await writeXlsxFileUniversal(fileData).toBlob();
}
