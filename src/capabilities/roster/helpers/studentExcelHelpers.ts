export interface StudentExportable {
  id: string;
  name: string;
  status?: string;
  phone?: string;
  school?: string;
  grade?: string;
  birthDate?: string;
  joinDate?: string;
  tuitionFee?: number;
  notes?: string;
  guardians?: any[];
}
import { getPrimaryGuardian } from '@/core/parent/guardianHelpers';

export interface ParsedStudentRow {
  name: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  birthDate?: string;
  school?: string;
  grade?: string;
  joinDate?: string;
  tuitionFee?: number;
  memo?: string;
}

export interface ParseErrorRow {
  rowNumber: number;
  raw: Record<string, string>;
  reason: string;
}

export interface CsvImportResult {
  validRows: ParsedStudentRow[];
  errorRows: ParseErrorRow[];
}

/**
 * 엑셀/CSV 파일 파싱 및 스마트 컬럼 매핑
 */
export function parseStudentCsvText(content: string): CsvImportResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { validRows: [], errorRows: [] };
  }

  // 1. 헤더 파싱
  const rawHeaders = splitCsvLine(lines[0]);
  const headerMap = mapHeaders(rawHeaders);

  const validRows: ParsedStudentRow[] = [];
  const errorRows: ParseErrorRow[] = [];

  // 2. 데이터 행 파싱
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;

    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    const nameKey = headerMap.name;
    const name = nameKey ? rowObj[nameKey]?.trim() : '';

    if (!name) {
      errorRows.push({
        rowNumber: i + 1,
        raw: rowObj,
        reason: '이름(원생명)이 누락되었습니다.',
      });
      continue;
    }

    const phoneKey = headerMap.phone;
    const phone = phoneKey ? sanitizePhone(rowObj[phoneKey]) : '';

    const guardianNameKey = headerMap.guardianName;
    const guardianName = guardianNameKey ? rowObj[guardianNameKey]?.trim() : '';

    const guardianPhoneKey = headerMap.guardianPhone;
    const guardianPhone = guardianPhoneKey ? sanitizePhone(rowObj[guardianPhoneKey]) : '';

    const tuitionKey = headerMap.tuition;
    let tuitionFee: number | undefined;
    if (tuitionKey && rowObj[tuitionKey]) {
      const parsedNum = Number(rowObj[tuitionKey].replace(/[^0-9]/g, ''));
      if (!Number.isNaN(parsedNum) && parsedNum > 0) {
        tuitionFee = parsedNum;
      }
    }

    validRows.push({
      name,
      phone: phone || undefined,
      guardianName: guardianName || undefined,
      guardianPhone: guardianPhone || undefined,
      guardianRelationship: '부모',
      school: headerMap.school ? rowObj[headerMap.school]?.trim() : undefined,
      grade: headerMap.grade ? rowObj[headerMap.grade]?.trim() : undefined,
      joinDate: headerMap.joinDate ? rowObj[headerMap.joinDate]?.trim() : undefined,
      birthDate: headerMap.birthDate ? rowObj[headerMap.birthDate]?.trim() : undefined,
      memo: headerMap.memo ? rowObj[headerMap.memo]?.trim() : undefined,
      tuitionFee,
    });
  }

  return { validRows, errorRows };
}

/**
 * 다양한 헤더 표기(원생명, 이름, 학생이름, 엄마번호 등)를 표준 필드로 자동 매핑
 */
function mapHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const h of headers) {
    const clean = h.replace(/\s+/g, '').toLowerCase();

    if (!map.name && (clean.includes('이름') || clean.includes('성명') || clean.includes('원생') || clean.includes('학생'))) {
      map.name = h;
    } else if (!map.guardianPhone && (clean.includes('보호자연락') || clean.includes('부모') || clean.includes('엄마') || clean.includes('아빠') || clean.includes('보호자폰'))) {
      map.guardianPhone = h;
    } else if (!map.guardianName && (clean.includes('보호자') || clean.includes('학부모'))) {
      map.guardianName = h;
    } else if (!map.phone && (clean.includes('연락처') || clean.includes('전화') || clean.includes('휴대폰') || clean.includes('본인번호'))) {
      map.phone = h;
    } else if (!map.tuition && (clean.includes('수강료') || clean.includes('원비') || clean.includes('금액') || clean.includes('비용'))) {
      map.tuition = h;
    } else if (!map.school && clean.includes('학교')) {
      map.school = h;
    } else if (!map.grade && clean.includes('학년')) {
      map.grade = h;
    } else if (!map.joinDate && (clean.includes('등록일') || clean.includes('입원일'))) {
      map.joinDate = h;
    } else if (!map.birthDate && clean.includes('생년월일')) {
      map.birthDate = h;
    } else if (!map.memo && (clean.includes('메모') || clean.includes('비고') || clean.includes('특이사항'))) {
      map.memo = h;
    }
  }

  return map;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function sanitizePhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith('01')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}

/**
 * 학생 목록을 UTF-8 BOM CSV로 브라우저 다운로드
 */
export function exportStudentsToCsv(students: StudentExportable[], filename = '원생명부_내보내기.csv'): void {
  const headers = [
    '원생명',
    '상태',
    '본인연락처',
    '주보호자',
    '보호자연락처',
    '학교',
    '학년',
    '생년월일',
    '등록일',
    '수강료',
    '메모',
  ];

  const rows = students.map((st) => {
    const guardian = getPrimaryGuardian(st.id);
    return [
      escapeCsv(st.name),
      escapeCsv(st.status === 'active' ? '재원' : st.status === 'paused' ? '휴원' : '퇴원'),
      escapeCsv(st.phone || ''),
      escapeCsv(guardian?.parentName || ''),
      escapeCsv(guardian?.parentPhone || ''),
      escapeCsv(st.school || ''),
      escapeCsv(st.grade || ''),
      escapeCsv(st.birthDate || ''),
      escapeCsv(st.joinDate || ''),
      escapeCsv(st.tuitionFee ? String(st.tuitionFee) : '0'),
      escapeCsv(st.notes || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 샘플 엑셀/CSV 양식 템플릿 다운로드
 */
export function downloadSampleCsvTemplate(filename = '원생_대량등록_양식.csv'): void {
  const sampleHeaders = [
    '원생명',
    '본인연락처',
    '보호자이름',
    '보호자연락처',
    '학교',
    '학년',
    '생년월일',
    '수강료',
    '메모',
  ];

  const sampleRows = [
    ['김민준', '010-1234-5678', '이수진 (모)', '010-9876-5432', '솔빛초등학교', '3학년', '2015-04-12', '180000', '피아노 기초 바이엘 2권'],
    ['박서아', '', '박진우 (부)', '010-5555-7777', '한빛초등학교', '1학년', '2017-09-20', '160000', '체르니 100번 입문'],
    ['이지우', '010-3333-4444', '최영희 (모)', '010-8888-9999', '중앙중학교', '1학년', '2013-01-15', '200000', '작품곡 레슨 희망'],
  ];

  const csvContent =
    '\uFEFF' +
    [sampleHeaders.join(','), ...sampleRows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
