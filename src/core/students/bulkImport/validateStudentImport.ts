import type {
  StudentImportNormalizedRow,
  StudentImportRawRow,
  StudentImportRowError,
  StudentImportValidationResult,
} from './types';
import { STUDENT_IMPORT_TEMPLATE_HEADERS } from './types';

const HEADER_ALIASES: Record<string, string> = {
  이름: '이름',
  name: '이름',
  성별: '성별',
  gender: '성별',
  생년월일: '생년월일',
  생일: '생년월일',
  birthdate: '생년월일',
  birth_date: '생년월일',
  'birth date': '생년월일',
  연락처: '연락처',
  전화: '연락처',
  phone: '연락처',
  학교: '학교',
  school: '학교',
  학년: '학년',
  grade: '학년',
  보호자이름: '보호자이름',
  보호자명: '보호자이름',
  학부모이름: '보호자이름',
  학부모명: '보호자이름',
  parent_name: '보호자이름',
  parentname: '보호자이름',
  보호자전화: '보호자전화',
  보호자연락처: '보호자전화',
  학부모전화: '보호자전화',
  학부모연락처: '보호자전화',
  '학부모 연락처': '보호자전화',
  '보호자 전화': '보호자전화',
  parent_phone: '보호자전화',
  parentphone: '보호자전화',
  보호자이메일: '보호자이메일',
  parent_email: '보호자이메일',
  관계: '관계',
  relationship: '관계',
  수강과목: '수강과목',
  과목: '수강과목',
  수강반: '수강과목',
  반: '수강과목',
  class: '수강과목',
  course: '수강과목',
  subject: '수강과목',
  입학일: '입학일',
  join_date: '입학일',
  월수강료: '월수강료',
  tuition: '월수강료',
  납부일: '납부일',
  payment_day: '납부일',
  메모: '메모',
  memo: '메모',
  notes: '메모',
};

export function normalizeHeader(raw: string): string {
  const trimmed = raw.trim().replace(/^\uFEFF/, '');
  const key = trimmed.toLowerCase().replace(/\s+/g, '');
  const spaced = trimmed.toLowerCase();
  return (
    HEADER_ALIASES[key] ||
    HEADER_ALIASES[spaced] ||
    HEADER_ALIASES[trimmed] ||
    trimmed
  );
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function parseGender(raw: string): 'M' | 'F' | '' {
  const v = raw.trim().toUpperCase();
  if (!v) return '';
  if (v === 'M' || v === '남' || v === '남성' || v === '남자') return 'M';
  if (v === 'F' || v === '여' || v === '여성' || v === '여자') return 'F';
  return '';
}

function parseRelationship(
  raw: string
): StudentImportNormalizedRow['relationship'] {
  const v = raw.trim();
  if (!v) return 'mother';
  if (/부|아빠|father|dad/i.test(v)) return 'father';
  if (/모|엄마|mother|mom/i.test(v)) return 'mother';
  if (/본인|self/i.test(v)) return 'self';
  return 'other';
}

/** YYYY-MM-DD 또는 Excel 시리얼·슬래시 날짜 */
export function parseImportDate(raw: string | number): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return excelSerialToIsoDate(raw);
  }
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  // Excel이 포맷한 로케일 날짜 등
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (y >= 1900 && y <= 2100) return `${y}-${mo}-${day}`;
  }
  return v;
}

/** SheetJS Excel date serial → Asia/Seoul 기준 날짜 문자열 */
export function excelSerialToIsoDate(serial: number): string {
  // Excel epoch 1899-12-30 (UTC)
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  const d = new Date(utc);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function parseMoney(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function parseDay(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9]/g, ''));
  if (!Number.isFinite(n) || n < 1 || n > 31) return null;
  return n;
}

export function normalizeImportRow(row: StudentImportRawRow): StudentImportNormalizedRow {
  const g = (h: string) => (row.values[h] || '').trim();
  const guardianName = g('보호자이름');
  const guardianPhone = normalizePhoneDigits(g('보호자전화'));
  const isAdultSelf = !guardianName && !guardianPhone;

  return {
    rowNumber: row.rowNumber,
    name: g('이름'),
    gender: parseGender(g('성별')),
    birthDate: parseImportDate(g('생년월일')),
    phone: normalizePhoneDigits(g('연락처')),
    school: g('학교'),
    grade: g('학년'),
    guardianName,
    guardianPhone,
    guardianEmail: g('보호자이메일'),
    relationship: parseRelationship(g('관계')),
    courseSubject: g('수강과목'),
    joinDate: parseImportDate(g('입학일')) || new Date().toISOString().slice(0, 10),
    tuitionFee: parseMoney(g('월수강료')),
    paymentDay: parseDay(g('납부일')),
    memo: g('메모'),
    isAdultSelf,
  };
}

export function validateStudentImportRows(
  rows: StudentImportRawRow[],
  existingKeys: Set<string>
): StudentImportValidationResult {
  const errors: StudentImportRowError[] = [];
  const warnings: StudentImportRowError[] = [];
  const validRows: StudentImportNormalizedRow[] = [];
  const seenInFile = new Set<string>();

  for (const raw of rows) {
    const row = normalizeImportRow(raw);

    if (!row.name) {
      errors.push({ rowNumber: row.rowNumber, field: '이름', message: '이름은 필수입니다.' });
      continue;
    }
    if (row.name.length < 2) {
      errors.push({
        rowNumber: row.rowNumber,
        field: '이름',
        message: '이름은 2자 이상이어야 합니다.',
      });
      continue;
    }

    if (!row.isAdultSelf) {
      if (!row.guardianName) {
        errors.push({
          rowNumber: row.rowNumber,
          field: '보호자이름',
          message: '보호자이름을 입력하거나, 성인 등록을 위해 보호자 칸을 비워 주세요.',
        });
        continue;
      }
      if (row.guardianPhone.length < 10 || row.guardianPhone.length > 11) {
        errors.push({
          rowNumber: row.rowNumber,
          field: '보호자전화',
          message: '학부모(보호자) 연락처는 10~11자리 숫자여야 합니다.',
        });
        continue;
      }
    } else if (row.phone && (row.phone.length < 10 || row.phone.length > 11)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: '연락처',
        message: '연락처는 10~11자리 숫자여야 합니다.',
      });
      continue;
    }

    if (!row.birthDate) {
      warnings.push({
        rowNumber: row.rowNumber,
        field: '생년월일',
        message: '생년월일이 비어 있습니다. 기본값(2000-01-01)으로 등록됩니다.',
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.birthDate)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: '생년월일',
        message: '생년월일은 YYYY-MM-DD 형식이어야 합니다.',
      });
      continue;
    }

    if (row.gender === '' && (raw.values['성별'] || '').trim()) {
      warnings.push({
        rowNumber: row.rowNumber,
        field: '성별',
        message: '성별을 인식하지 못해 비워 둡니다. (M/F 또는 남/여)',
      });
    }

    if (!row.courseSubject) {
      warnings.push({
        rowNumber: row.rowNumber,
        field: '수강과목',
        message: '수강과목이 비어 있습니다. 반은 나중에 배정할 수 있습니다.',
      });
    }

    const dupKey = `${row.name}|${row.guardianPhone || row.phone}`;
    if (seenInFile.has(dupKey)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: '파일 내 중복 행입니다. (이름+전화)',
      });
      continue;
    }
    seenInFile.add(dupKey);

    if (existingKeys.has(dupKey)) {
      warnings.push({
        rowNumber: row.rowNumber,
        message: '이미 등록된 수강생과 유사합니다. (이름+전화) — 그래도 등록합니다.',
      });
    }

    validRows.push(row);
  }

  return { validRows, errors, warnings };
}

/** 기존 수강생과의 중복 키 집합 */
export function buildExistingStudentKeys(
  students: Array<{ name: string; phone?: string }>,
  parentsByStudent: Map<string, { phone?: string }>
): Set<string> {
  const keys = new Set<string>();
  for (const s of students) {
    const parentPhone = parentsByStudent.get(s.name)?.phone || '';
    keys.add(`${s.name}|${normalizePhoneDigits(s.phone || '')}`);
    if (parentPhone) keys.add(`${s.name}|${normalizePhoneDigits(parentPhone)}`);
  }
  return keys;
}

export function buildTemplateCsv(): string {
  const header = STUDENT_IMPORT_TEMPLATE_HEADERS.join(',');
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
  ].join(',');
  return `\uFEFF${header}\n${sample}\n`;
}
