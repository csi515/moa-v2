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
