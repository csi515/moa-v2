import type { ComponentType } from 'react';

export interface ParentStudentStampViewSlotProps {
  organizationId: string;
  childrenOptions: { id: string; name: string }[];
  initialCustomerId?: string;
  onToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface StudentStampBoardSlotProps {
  organizationId: string;
  customerId: string;
  studentName: string;
  boardSize?: 20 | 30;
  canRequest?: boolean;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

let parentStudentStampViewSlot: ComponentType<ParentStudentStampViewSlotProps> | null = null;
let studentStampBoardSlot: ComponentType<StudentStampBoardSlotProps> | null = null;

/**
 * Composition 계층(app/loadIndustryModules)에서 주입.
 * parent 모듈은 개별 업종(piano 등)을 직접 import하지 않는다.
 */
export function registerParentStudentStampViewSlot(
  component: ComponentType<ParentStudentStampViewSlotProps>
): void {
  parentStudentStampViewSlot = component;
}

export function getParentStudentStampViewSlot(): ComponentType<ParentStudentStampViewSlotProps> | null {
  return parentStudentStampViewSlot;
}

export function registerStudentStampBoardSlot(
  component: ComponentType<StudentStampBoardSlotProps>
): void {
  studentStampBoardSlot = component;
}

export function getStudentStampBoardSlot(): ComponentType<StudentStampBoardSlotProps> | null {
  return studentStampBoardSlot;
}

/** 범용 포털 탭 슬롯 인터페이스 */
export interface GenericParentPortalTabSlotProps {
  student: any;
  organizationId: string;
  readOnly?: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefresh: () => void;
  onNavigate: (tab: any) => void;
  industryType?: string;
  [key: string]: any;
}

const customTabSlots = new Map<string, ComponentType<GenericParentPortalTabSlotProps>>();

export function registerParentPortalTabSlot(
  tabId: string,
  component: ComponentType<GenericParentPortalTabSlotProps>
): void {
  customTabSlots.set(tabId, component);
}

export function getParentPortalTabSlot(
  tabId: string
): ComponentType<GenericParentPortalTabSlotProps> | undefined {
  return customTabSlots.get(tabId);
}

/** 범용 포털 홈 위젯 슬롯 인터페이스 */
export interface ParentHomeWidgetSlotProps {
  student: any;
  organizationId: string;
  onNavigate: (tab: any) => void;
  industryType?: string;
}

const homeWidgetSlots = new Map<string, ComponentType<ParentHomeWidgetSlotProps>>();

export function registerParentHomeWidgetSlot(
  industryOrKey: string,
  component: ComponentType<ParentHomeWidgetSlotProps>
): void {
  homeWidgetSlots.set(industryOrKey, component);
}

export function getParentHomeWidgetSlot(
  industryOrKey: string
): ComponentType<ParentHomeWidgetSlotProps> | undefined {
  return homeWidgetSlots.get(industryOrKey);
}
