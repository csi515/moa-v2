/** 수강생 CSV/Excel 대량 등록 — 컬럼·행 타입 */

export const STUDENT_IMPORT_TEMPLATE_HEADERS = [
  '이름',
  '성별',
  '생년월일',
  '연락처',
  '학교',
  '학년',
  '보호자이름',
  '보호자전화',
  '보호자이메일',
  '관계',
  '수강과목',
  '입학일',
  '월수강료',
  '납부일',
  '메모',
] as const;

export type StudentImportHeader = (typeof STUDENT_IMPORT_TEMPLATE_HEADERS)[number];

/** 파싱된 원본 행 (문자열) */
export interface StudentImportRawRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface StudentImportNormalizedRow {
  rowNumber: number;
  name: string;
  gender: 'M' | 'F' | '';
  birthDate: string;
  phone: string;
  school: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  relationship: 'father' | 'mother' | 'other' | 'self';
  /** 반/과목명 (기존 Class.name 매칭용) */
  courseSubject: string;
  joinDate: string;
  tuitionFee: number | null;
  paymentDay: number | null;
  memo: string;
  /** 보호자 없음 = 성인 본인 등록 */
  isAdultSelf: boolean;
}

export interface StudentImportRowError {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface StudentImportValidationResult {
  validRows: StudentImportNormalizedRow[];
  errors: StudentImportRowError[];
  warnings: StudentImportRowError[];
}

export const STUDENT_IMPORT_UI = {
  title: '수강생 일괄 등록',
  downloadTemplate: '템플릿 다운로드 (CSV)',
  downloadTemplateXlsx: '템플릿 다운로드 (Excel)',
  pickFile: 'CSV 또는 Excel 선택',
  dropHint: '엑셀·CSV 파일을 여기에 끌어다 놓거나 클릭하여 선택하세요',
  dropActive: '파일을 놓으면 검사를 시작합니다',
  preview: '미리보기',
  importAction: '등록 시작',
  importing: '등록 중…',
  done: '등록 완료',
  emptyFile: '파일에 데이터가 없습니다.',
  unsupported: 'CSV(.csv) 또는 Excel(.xlsx, .xls) 파일만 지원합니다.',
} as const;
