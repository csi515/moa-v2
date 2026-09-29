import type { ReactNode } from 'react';
import type {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AcademyEvent,
  PerformanceVideo,
} from '@/types';
import type { DetailTab, DetailTabConfigItem, DetailTabCounts } from './types';

/** 출결 저장 전 업종별 부가 처리 (회차권 차감 등) */
export type StudentDetailAttendanceSideEffect = (params: {
  student: Student;
  nextStatus: AttendanceStatus;
  previous: AttendanceRecord | null;
  date: string;
}) => { warning?: string; sessionPassId?: string };

/** 연주 영상 폼: 행사 타입 → 영상 분류 (Module이 제공) */
export type StudentDetailMapEventToVideoType = (
  eventType: AcademyEvent['type']
) => PerformanceVideo['eventType'];

export interface StudentDetailHeaderActionsProps {
  student: Student;
}

export interface StudentDetailExtraTabProps {
  tab: DetailTab;
  student: Student;
}

export interface StudentDetailModalsProps {
  student: Student;
  /** 교재 판매 등 모달 상태 — Core tuition 탭과 공유 */
  textbooks: {
    isStudentSaleModalOpen: boolean;
    setIsStudentSaleModalOpen: (open: boolean) => void;
    isStudentTbPaymentModalOpen: boolean;
    setIsStudentTbPaymentModalOpen: (open: boolean) => void;
    selectedStudentSaleForPay: import('@/types').TextbookSale | null;
    setSelectedStudentSaleForPay: (sale: import('@/types').TextbookSale | null) => void;
    isTbReceiptOpen: boolean;
    setIsTbReceiptOpen: (open: boolean) => void;
    tbReceiptSale: import('@/types').TextbookSale | null;
    setTbReceiptSale: (sale: import('@/types').TextbookSale | null) => void;
  };
  triggerRefresh: () => void;
  onCloseDetail: () => void;
}

/**
 * 업종별 학생 상세 확장.
 * Core가 Module을 직접 import하지 않도록 plugin에서 등록한다.
 */
export interface StudentDetailExtension {
  industryId: string;
  resolveTabs?: (
    tabs: DetailTabConfigItem[],
    counts: DetailTabCounts
  ) => DetailTabConfigItem[];
  /** 빠른 액션 줄에 추가 버튼 */
  renderHeaderActions?: (props: StudentDetailHeaderActionsProps) => ReactNode;
  /** Core에 없는 탭 본문 (charts 등). 처리하면 ReactNode, 아니면 null */
  renderExtraTab?: (props: StudentDetailExtraTabProps) => ReactNode | null;
  /** 교재·스탬프 등 Module 모달 */
  renderModals?: (props: StudentDetailModalsProps) => ReactNode;
  applyAttendanceSideEffect?: StudentDetailAttendanceSideEffect;
  /** 연주 영상 타입 라벨 (없으면 Core 기본) */
  performanceVideoTypeLabel?: Record<string, string>;
  /** 행사 선택 시 영상 eventType 매핑 (없으면 'other') */
  mapEventTypeToVideoType?: StudentDetailMapEventToVideoType;
}

const extensions = new Map<string, StudentDetailExtension>();

export function registerStudentDetailExtension(ext: StudentDetailExtension): () => void {
  extensions.set(ext.industryId, ext);
  return () => {
    if (extensions.get(ext.industryId) === ext) {
      extensions.delete(ext.industryId);
    }
  };
}

export function getStudentDetailExtension(
  industryId: string | null | undefined
): StudentDetailExtension | undefined {
  if (!industryId) return undefined;
  return extensions.get(industryId);
}

export function resolveStudentDetailTabs(
  industryId: string | null | undefined,
  tabs: DetailTabConfigItem[],
  counts: DetailTabCounts
): DetailTabConfigItem[] {
  const ext = getStudentDetailExtension(industryId);
  if (ext?.resolveTabs) return ext.resolveTabs(tabs, counts);
  return tabs;
}

export function runStudentDetailAttendanceSideEffect(
  industryId: string | null | undefined,
  params: Parameters<StudentDetailAttendanceSideEffect>[0]
): { warning?: string; sessionPassId?: string } {
  const effect = getStudentDetailExtension(industryId)?.applyAttendanceSideEffect;
  if (!effect) return {};
  return effect(params) || {};
}

export function mapStudentDetailEventToVideoType(
  industryId: string | null | undefined,
  eventType: AcademyEvent['type']
): PerformanceVideo['eventType'] {
  const map = getStudentDetailExtension(industryId)?.mapEventTypeToVideoType;
  if (map) return map(eventType);
  return 'other';
}
