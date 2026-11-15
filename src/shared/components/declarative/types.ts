import type { ReactNode } from 'react';
import type { BaseRecord } from '@refinedev/core';

/**
 * 선언형 컬럼 명세 (AutoColumn)
 */
export interface AutoColumn<TRecord extends BaseRecord = BaseRecord> {
  /** 데이터 프로퍼티 키 */
  key: string;
  /** 테이블 헤더 표시 텍스트 */
  header: string;
  /** 커스텀 렌더러 */
  render?: (value: any, record: TRecord, index: number) => ReactNode;
  /** 컬럼 정렬 지원 여부 (기본값: false) */
  sortable?: boolean;
  /** 텍스트 정렬 (기본값: left, isNumeric일 때 right) */
  align?: 'left' | 'center' | 'right';
  /** 숫자 데이터 여부 (true 시 tabular-nums 고정폭 및 우측 정렬 자동 적용) */
  isNumeric?: boolean;
  /** 폭 지정 (예: '120px', '20%') */
  width?: string | number;
  /** 모바일 카드 뷰에서의 노출 제어 */
  mobilePriority?: 'title' | 'high' | 'medium' | 'low' | 'hide';
}

/**
 * 선언형 폼 필드 명세 (AutoField)
 */
export interface AutoField<TFormData extends Record<string, any> = Record<string, any>> {
  /** 폼 프로퍼티 키 */
  name: string;
  /** 필드 표시 라벨 */
  label: string;
  /** 인풋 컴포넌트 타입 */
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'switch';
  /** 셀렉트 인풋 전용 옵션 배열 */
  options?: Array<{ label: string; value: string | number | boolean }>;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 기본값 */
  defaultValue?: any;
  /** 보조 안내 텍스트 */
  helperText?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * AutoDataTable 컴포넌트 Props
 */
export interface AutoDataTableProps<TRecord extends BaseRecord = BaseRecord> {
  /** 대상 백엔드 리소스명 (예: 'customers', 'lockers', 'passes') */
  resource: string;
  /** 화면 또는 테이블 제목 */
  title?: string;
  /** 엔티티 한글 명칭 (예: '고객', '라커', '이용권') */
  entityName?: string;
  /** 컬럼 정의 목록 */
  columns: AutoColumn<TRecord>[];
  /** 검색창 플레이스홀더 */
  searchPlaceholder?: string;
  /** 상단 우측 추가 액션 슬롯 (예: [신규 등록] 버튼 등) */
  extraActions?: ReactNode;
  /** 행 클릭 이벤트 핸들러 */
  onRowClick?: (record: TRecord) => void;
  /** 기본 페이지당 항목 수 (기본값: 15) */
  pageSize?: number;
  /** 액션 가능한 Empty State 버튼 라벨 */
  emptyActionLabel?: string;
  /** 액션 가능한 Empty State 버튼 클릭 핸들러 */
  onEmptyAction?: () => void;
  /** 테넌트 자동 필터링 비활성화 여부 */
  disableTenantFilter?: boolean;
  /** 데이터 스키마 (예: 'piano', 'bath') */
  schema?: string;
}

/**
 * AutoEntityModal 컴포넌트 Props
 */
export interface AutoEntityModalProps<TFormData extends Record<string, any> = Record<string, any>> {
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 모달 제목 */
  title?: string;
  /** 엔티티 한글 명칭 */
  entityName?: string;
  /** 대상 백엔드 리소스명 */
  resource: string;
  /** 폼 필드 정의 목록 */
  fields: AutoField<TFormData>[];
  /** 수정 모드일 때 대상 레코드 ID (미지정 시 신규 생성 모드) */
  recordId?: string | number;
  /** 폼 초기값 */
  initialValues?: Partial<TFormData>;
  /** 저장 완료 후 콜백 */
  onSuccess?: (savedData: any) => void;
  /** 커스텀 성공 메시지 */
  successMessage?: string;
}
