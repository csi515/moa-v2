/**
 * exportTableToCsv
 * 테이블 또는 리스트 데이터를 UTF-8 with BOM 형식의 CSV 파일로 내보냅니다.
 * 엑셀(Microsoft Excel)에서 한글이 깨지지 않도록 \uFEFF 바이트 오더 마크를 포함합니다.
 */

export interface CsvColumn<T> {
  header: string;
  key?: keyof T;
  formatter?: (row: T) => string | number | null | undefined;
}

export function exportTableToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  if (typeof window === 'undefined') return;

  // 헤더 행 생성
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(',');

  // 데이터 행 생성
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        let val: unknown;
        if (col.formatter) {
          val = col.formatter(row);
        } else if (col.key !== undefined) {
          val = row[col.key];
        } else {
          val = '';
        }
        return escapeCsvValue(val === null || val === undefined ? '' : String(val));
      })
      .join(',');
  });

  // BOM + CSV 결합
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val: string): string {
  // 따옴표나 쉼표, 개행이 포함된 경우 큰따옴표로 감싸고 내부 큰따옴표는 두 번 연속("") 처리
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
